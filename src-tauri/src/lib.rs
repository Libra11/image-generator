use std::{
    sync::atomic::{AtomicU64, Ordering},
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use base64::Engine;
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use tauri::Manager;

const DEFAULT_BASE_URL: &str = "https://dashscope.aliyuncs.com/compatible-mode/v1";
const DEFAULT_IMAGE_COUNT: u8 = 1;
const MAX_IMAGE_COUNT: u8 = 6;
const MAX_REQUEST_IMAGE_DIMENSION: u32 = 2048;
const MIN_REQUEST_IMAGE_DIMENSION: u32 = 512;
const MAX_SOURCE_IMAGE_BYTES: usize = 10 * 1024 * 1024;
const MAX_GENERATED_IMAGE_BYTES: usize = 40 * 1024 * 1024;
static IMAGE_FILE_SEQUENCE: AtomicU64 = AtomicU64::new(0);

const TEXT_TO_IMAGE_PRIORITIES: &[&str] = &[
    "qwen-image-2.0-pro",
    "qwen-image-2.0-pro-2026-04-22",
    "qwen-image-2.0",
    "qwen-image-2.0-2026-03-03",
    "qwen-image-max",
    "qwen-image-max-2025-12-30",
    "qwen-image-plus-2026-01-09",
    "wan2.7-image-pro",
    "wan2.7-image",
    "z-image-turbo",
];

const IMAGE_EDIT_PRIORITIES: &[&str] = &[
    "qwen-image-edit-max",
    "qwen-image-edit-max-2026-01-16",
    "qwen-image-2.0-pro",
    "qwen-image-2.0-pro-2026-04-22",
    "qwen-image-edit-plus",
    "qwen-image-edit-plus-2025-12-15",
    "qwen-image-edit-plus-2025-10-30",
    "qwen-image-edit",
    "qwen-image-2.0",
    "qwen-image-2.0-2026-03-03",
];

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GenerateImageRequest {
    api_key: Option<String>,
    base_url: Option<String>,
    extra_body: Option<String>,
    image_count: Option<u8>,
    negative_prompt: Option<String>,
    prompt: String,
    selected_model: Option<String>,
    size: Option<String>,
    source_images: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ModelProfileRequest {
    api_key: Option<String>,
    base_url: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ModelCapability {
    id: String,
    capability_summary: String,
    max_image_count: u8,
    supports_custom_size: bool,
    supports_image_edit: bool,
    supports_text_to_image: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ModelProfileResponse {
    image_edit_model: Option<String>,
    image_edit_models: Vec<String>,
    models: Vec<ModelCapability>,
    supported_models: Vec<String>,
    text_to_image_model: Option<String>,
    text_to_image_models: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct GeneratedImage {
    revised_prompt: Option<String>,
    source_type: String,
    src: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct GenerateImageResponse {
    images: Vec<GeneratedImage>,
    model: Option<String>,
    request_id: Option<String>,
    supported_models: Vec<String>,
    task_type: String,
}

#[tauri::command]
async fn get_model_profile(request: ModelProfileRequest) -> Result<ModelProfileResponse, String> {
    let base_url = resolve_base_url(request.base_url);
    let api_key = resolve_api_key(request.api_key)?;
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|error| format!("创建 HTTP 客户端失败：{error}"))?;

    let supported_models = fetch_supported_models(&client, &base_url, &api_key).await?;
    Ok(build_model_profile(supported_models))
}

#[tauri::command]
async fn generate_images(
    app: tauri::AppHandle,
    request: GenerateImageRequest,
) -> Result<GenerateImageResponse, String> {
    let prompt = request.prompt.trim();
    if prompt.is_empty() {
        return Err("提示词不能为空。".to_string());
    }

    let base_url = resolve_base_url(request.base_url);
    let api_key = resolve_api_key(request.api_key)?;
    let source_images = sanitize_source_images(request.source_images);
    validate_source_images(&source_images)?;

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(180))
        .build()
        .map_err(|error| format!("创建 HTTP 客户端失败：{error}"))?;

    let supported_models = fetch_supported_models(&client, &base_url, &api_key).await?;
    let model_profile = build_model_profile(supported_models);

    if model_profile.supported_models.is_empty() {
        return Err("当前账号的 /models 响应里没有可用图像模型。".to_string());
    }

    let (task_type, model, capability, endpoint) = if source_images.is_empty() {
        let model = choose_model(
            request.selected_model.clone(),
            &model_profile.text_to_image_models,
            model_profile.text_to_image_model.as_deref(),
            "文生图",
        )?;
        let capability = model_profile
            .models
            .iter()
            .find(|item| item.id == model)
            .cloned()
            .ok_or_else(|| format!("未找到模型 `{model}` 的能力描述。"))?;
        (
            "文生图".to_string(),
            model,
            capability,
            derive_multimodal_endpoint(&base_url),
        )
    } else {
        let model = choose_model(
            request.selected_model,
            &model_profile.image_edit_models,
            model_profile.image_edit_model.as_deref(),
            "图生图",
        )?;
        let capability = model_profile
            .models
            .iter()
            .find(|item| item.id == model)
            .cloned()
            .ok_or_else(|| format!("未找到模型 `{model}` 的能力描述。"))?;
        (
            "图生图".to_string(),
            model,
            capability,
            derive_multimodal_endpoint(&base_url),
        )
    };

    let image_count = request
        .image_count
        .unwrap_or(DEFAULT_IMAGE_COUNT)
        .clamp(1, capability.max_image_count.min(MAX_IMAGE_COUNT));

    let body = if source_images.is_empty() {
        build_text_to_image_body(
            &model,
            prompt,
            image_count,
            capability.supports_custom_size,
            request.size,
            request.negative_prompt,
            request.extra_body,
        )?
    } else {
        build_image_edit_body(
            &model,
            prompt,
            &source_images,
            image_count,
            capability.supports_custom_size,
            request.size,
            request.negative_prompt,
            request.extra_body,
        )?
    };

    let response = client
        .post(endpoint)
        .bearer_auth(api_key)
        .json(&body)
        .send()
        .await
        .map_err(|error| format!("调用 {task_type} 接口失败：{error}"))?;

    let status = response.status();
    let response_text = response
        .text()
        .await
        .map_err(|error| format!("读取接口响应失败：{error}"))?;

    if !status.is_success() {
        return Err(format!(
            "接口返回失败（{}）：{}",
            status.as_u16(),
            extract_error_message(&response_text)
        ));
    }

    let payload: Value = serde_json::from_str(&response_text).map_err(|error| {
        format!(
            "接口返回了无法解析的 JSON：{error}，原始响应：{}",
            trim_response(&response_text)
        )
    })?;

    let images = extract_images(&payload)?;
    if images.is_empty() {
        return Err(format!(
            "接口调用成功，但未返回可展示图片：{}",
            trim_response(&response_text)
        ));
    }
    // Remote generation URLs are temporary. Cache successful results locally before
    // returning them so persisted history does not depend on an expiring URL.
    let images = cache_generated_images(&app, &client, images).await;

    Ok(GenerateImageResponse {
        images,
        model: Some(model),
        request_id: payload
            .get("request_id")
            .and_then(Value::as_str)
            .map(ToOwned::to_owned)
            .or_else(|| {
                payload
                    .get("id")
                    .and_then(Value::as_str)
                    .map(ToOwned::to_owned)
            }),
        supported_models: model_profile.supported_models,
        task_type,
    })
}

fn resolve_base_url(base_url: Option<String>) -> String {
    non_empty_value(base_url)
        .or_else(|| std::env::var("DASHSCOPE_BASE_URL").ok())
        .unwrap_or_else(|| DEFAULT_BASE_URL.to_string())
}

fn resolve_api_key(api_key: Option<String>) -> Result<String, String> {
    if let Some(api_key) = non_empty_value(api_key) {
        return Ok(api_key);
    }

    std::env::var("DASHSCOPE_API_KEY")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "请填写 API Key，或设置环境变量 DASHSCOPE_API_KEY。".to_string())
}

fn non_empty_value(value: Option<String>) -> Option<String> {
    value.and_then(|raw| {
        let trimmed = raw.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    })
}

fn sanitize_source_images(source_images: Option<Vec<String>>) -> Vec<String> {
    source_images
        .unwrap_or_default()
        .into_iter()
        .filter_map(|value| non_empty_value(Some(value)))
        .take(3)
        .collect()
}

fn validate_source_images(source_images: &[String]) -> Result<(), String> {
    for (index, image) in source_images.iter().enumerate() {
        let Some(size_in_bytes) = estimate_embedded_image_size(image)? else {
            continue;
        };

        if size_in_bytes > MAX_SOURCE_IMAGE_BYTES {
            return Err(format!(
                "第 {} 张参考图大小为 {}，超过 DashScope 的 10MB 上限，请先压缩后再上传。",
                index + 1,
                format_size(size_in_bytes)
            ));
        }
    }

    Ok(())
}

fn estimate_embedded_image_size(image: &str) -> Result<Option<usize>, String> {
    let trimmed = image.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }

    let payload = if let Some((metadata, payload)) = trimmed.split_once(',') {
        if metadata.starts_with("data:") && metadata.contains(";base64") {
            payload
        } else {
            return Ok(None);
        }
    } else {
        return Ok(None);
    };

    let length = payload.len();
    if length == 0 {
        return Ok(Some(0));
    }

    let padding = payload
        .as_bytes()
        .iter()
        .rev()
        .take_while(|byte| **byte == b'=')
        .count();

    Ok(Some((length * 3) / 4usize - padding))
}

fn format_size(size_in_bytes: usize) -> String {
    if size_in_bytes < 1024 * 1024 {
        format!("{:.1}KB", size_in_bytes as f64 / 1024.0)
    } else {
        format!("{:.2}MB", size_in_bytes as f64 / 1024.0 / 1024.0)
    }
}

async fn fetch_supported_models(
    client: &reqwest::Client,
    base_url: &str,
    api_key: &str,
) -> Result<Vec<String>, String> {
    let endpoint = format!("{}/models", base_url.trim_end_matches('/'));
    let response = client
        .get(endpoint)
        .bearer_auth(api_key)
        .send()
        .await
        .map_err(|error| format!("读取账号模型列表失败：{error}"))?;
    let status = response.status();
    let response_text = response
        .text()
        .await
        .map_err(|error| format!("读取模型列表响应失败：{error}"))?;

    if !status.is_success() {
        return Err(format!(
            "读取账号模型列表失败（{}）：{}",
            status.as_u16(),
            extract_error_message(&response_text)
        ));
    }

    let payload: Value = serde_json::from_str(&response_text).map_err(|error| {
        format!(
            "账号模型列表不是合法 JSON：{error}，原始响应：{}",
            trim_response(&response_text)
        )
    })?;

    let mut models = payload
        .get("data")
        .and_then(Value::as_array)
        .ok_or_else(|| "账号模型列表响应缺少 data 字段。".to_string())?
        .iter()
        .filter_map(|item| item.get("id").and_then(Value::as_str))
        .map(ToOwned::to_owned)
        .collect::<Vec<_>>();

    models.sort();
    models.dedup();

    Ok(models)
}

fn filter_image_models(models: Vec<String>) -> Vec<String> {
    models
        .into_iter()
        .filter(|model| {
            let lower = model.to_ascii_lowercase();
            lower.contains("qwen-image")
                || lower.contains("wan2.7-image")
                || lower.contains("z-image")
        })
        .collect()
}

fn build_model_profile(models: Vec<String>) -> ModelProfileResponse {
    let supported_models = filter_image_models(models);
    let capabilities = supported_models
        .iter()
        .map(|model| classify_model(model))
        .collect::<Vec<_>>();
    let text_to_image_models =
        order_candidates(&capabilities, TEXT_TO_IMAGE_PRIORITIES, |capability| {
            capability.supports_text_to_image
        });
    let image_edit_models = order_candidates(&capabilities, IMAGE_EDIT_PRIORITIES, |capability| {
        capability.supports_image_edit
    });

    ModelProfileResponse {
        image_edit_model: image_edit_models.first().cloned(),
        image_edit_models,
        models: capabilities,
        supported_models,
        text_to_image_model: text_to_image_models.first().cloned(),
        text_to_image_models,
    }
}

fn classify_model(model: &str) -> ModelCapability {
    let lower = model.to_ascii_lowercase();

    if lower.starts_with("qwen-image-2.0") {
        return ModelCapability {
            id: model.to_string(),
            capability_summary: "文生图 + 图生图，支持自定义尺寸，最多 6 张".to_string(),
            max_image_count: 6,
            supports_custom_size: true,
            supports_image_edit: true,
            supports_text_to_image: true,
        };
    }

    if lower.starts_with("qwen-image-edit-max") || lower.starts_with("qwen-image-edit-plus") {
        return ModelCapability {
            id: model.to_string(),
            capability_summary: "图生图，支持自定义尺寸，最多 6 张".to_string(),
            max_image_count: 6,
            supports_custom_size: true,
            supports_image_edit: true,
            supports_text_to_image: false,
        };
    }

    if lower == "qwen-image-edit" {
        return ModelCapability {
            id: model.to_string(),
            capability_summary: "图生图，尺寸自动决定，固定 1 张".to_string(),
            max_image_count: 1,
            supports_custom_size: false,
            supports_image_edit: true,
            supports_text_to_image: false,
        };
    }

    if lower.starts_with("qwen-image-max")
        || lower.starts_with("qwen-image-plus")
        || lower.starts_with("wan2.7-image")
        || lower.starts_with("z-image")
    {
        return ModelCapability {
            id: model.to_string(),
            capability_summary: "文生图，支持自定义尺寸，默认单张输出".to_string(),
            max_image_count: 1,
            supports_custom_size: true,
            supports_image_edit: false,
            supports_text_to_image: true,
        };
    }

    ModelCapability {
        id: model.to_string(),
        capability_summary: "图像模型，使用默认参数更稳妥".to_string(),
        max_image_count: 1,
        supports_custom_size: true,
        supports_image_edit: lower.contains("edit"),
        supports_text_to_image: !lower.contains("edit"),
    }
}

fn order_candidates(
    capabilities: &[ModelCapability],
    priorities: &[&str],
    predicate: impl Fn(&ModelCapability) -> bool,
) -> Vec<String> {
    let mut ordered = priorities
        .iter()
        .filter_map(|candidate| capabilities.iter().find(|item| item.id == *candidate))
        .map(|item| item.id.clone())
        .collect::<Vec<_>>();

    for capability in capabilities {
        if predicate(capability) && !ordered.iter().any(|item| item == &capability.id) {
            ordered.push(capability.id.clone());
        }
    }

    ordered
}

fn choose_model(
    selected_model: Option<String>,
    candidates: &[String],
    auto_model: Option<&str>,
    task_type: &str,
) -> Result<String, String> {
    if let Some(model) = non_empty_value(selected_model) {
        if candidates.iter().any(|candidate| candidate == &model) {
            return Ok(model);
        }

        return Err(format!(
            "你选择的{}模型 `{}` 当前不可用。可选模型：{}",
            task_type,
            model,
            candidates.join("、")
        ));
    }

    auto_model
        .map(ToOwned::to_owned)
        .ok_or_else(|| format!("当前账号没有可用的{}模型。", task_type))
}

fn build_text_to_image_body(
    model: &str,
    prompt: &str,
    image_count: u8,
    supports_custom_size: bool,
    size: Option<String>,
    negative_prompt: Option<String>,
    extra_body: Option<String>,
) -> Result<Map<String, Value>, String> {
    let mut parameters = Map::new();
    parameters.insert("n".to_string(), json!(image_count));

    if supports_custom_size {
        if let Some(size) = normalize_size(size)? {
            parameters.insert("size".to_string(), Value::String(size));
        }
    }

    if let Some(negative_prompt) = non_empty_value(negative_prompt) {
        parameters.insert(
            "negative_prompt".to_string(),
            Value::String(negative_prompt),
        );
    }

    merge_extra_body(&mut parameters, extra_body)?;

    let mut body = Map::new();
    body.insert("model".to_string(), Value::String(model.to_string()));
    body.insert(
        "input".to_string(),
        json!({
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "text": prompt
                        }
                    ]
                }
            ]
        }),
    );
    body.insert("parameters".to_string(), Value::Object(parameters));

    Ok(body)
}

fn build_image_edit_body(
    model: &str,
    prompt: &str,
    source_images: &[String],
    image_count: u8,
    supports_custom_size: bool,
    size: Option<String>,
    negative_prompt: Option<String>,
    extra_body: Option<String>,
) -> Result<Map<String, Value>, String> {
    let mut content = source_images
        .iter()
        .map(|image| json!({ "image": image }))
        .collect::<Vec<_>>();
    content.push(json!({ "text": prompt }));

    let mut parameters = Map::new();
    parameters.insert("n".to_string(), json!(image_count));

    if supports_custom_size {
        if let Some(size) = normalize_size(size)? {
            parameters.insert("size".to_string(), Value::String(size));
        }
    }

    if let Some(negative_prompt) = non_empty_value(negative_prompt) {
        parameters.insert(
            "negative_prompt".to_string(),
            Value::String(negative_prompt),
        );
    }

    merge_extra_body(&mut parameters, extra_body)?;

    let mut body = Map::new();
    body.insert("model".to_string(), Value::String(model.to_string()));
    body.insert(
        "input".to_string(),
        json!({
            "messages": [
                {
                    "role": "user",
                    "content": content
                }
            ]
        }),
    );
    body.insert("parameters".to_string(), Value::Object(parameters));

    Ok(body)
}

fn normalize_size(size: Option<String>) -> Result<Option<String>, String> {
    let Some(value) = non_empty_value(size) else {
        return Ok(None);
    };

    let normalized = value.replace('x', "*").replace('X', "*");
    let Some((width, height)) = normalized.split_once('*') else {
        return Err("尺寸格式必须是 宽x高，例如 1344x768。".to_string());
    };

    let width = width
        .trim()
        .parse::<u32>()
        .map_err(|_| "尺寸格式必须是 宽x高，例如 1344x768。".to_string())?;
    let height = height
        .trim()
        .parse::<u32>()
        .map_err(|_| "尺寸格式必须是 宽x高，例如 1344x768。".to_string())?;

    if !(MIN_REQUEST_IMAGE_DIMENSION..=MAX_REQUEST_IMAGE_DIMENSION).contains(&width)
        || !(MIN_REQUEST_IMAGE_DIMENSION..=MAX_REQUEST_IMAGE_DIMENSION).contains(&height)
    {
        return Err(format!(
            "尺寸宽高都必须在 {}-{}px 之间。",
            MIN_REQUEST_IMAGE_DIMENSION, MAX_REQUEST_IMAGE_DIMENSION
        ));
    }

    Ok(Some(format!("{width}*{height}")))
}

fn derive_multimodal_endpoint(base_url: &str) -> String {
    let trimmed = base_url.trim_end_matches('/');
    if trimmed.contains("/compatible-mode/v1") {
        format!(
            "{}/services/aigc/multimodal-generation/generation",
            trimmed.replacen("/compatible-mode/v1", "/api/v1", 1)
        )
    } else {
        format!("{trimmed}/services/aigc/multimodal-generation/generation")
    }
}

fn merge_extra_body(
    body: &mut Map<String, Value>,
    extra_body: Option<String>,
) -> Result<(), String> {
    let Some(extra_body) = non_empty_value(extra_body) else {
        return Ok(());
    };

    let extra_value: Value = serde_json::from_str(&extra_body)
        .map_err(|error| format!("高级参数 JSON 解析失败：{error}"))?;
    let extra_object = extra_value
        .as_object()
        .ok_or_else(|| "高级参数 JSON 必须是对象，例如 {\"seed\": 42}。".to_string())?;

    for (key, value) in extra_object {
        body.insert(key.clone(), value.clone());
    }

    Ok(())
}

fn extract_images(payload: &Value) -> Result<Vec<GeneratedImage>, String> {
    if let Some(data) = payload.get("data").and_then(Value::as_array) {
        return data.iter().map(extract_image_from_item).collect();
    }

    if let Some(contents) = payload
        .get("output")
        .and_then(|output| output.get("choices"))
        .and_then(Value::as_array)
        .and_then(|choices| choices.first())
        .and_then(|choice| choice.get("message"))
        .and_then(|message| message.get("content"))
        .and_then(Value::as_array)
    {
        return contents
            .iter()
            .filter(|item| item.get("image").is_some())
            .map(extract_image_from_item)
            .collect();
    }

    if let Some(results) = payload
        .get("output")
        .and_then(|output| output.get("results"))
        .and_then(Value::as_array)
    {
        return results.iter().map(extract_image_from_item).collect();
    }

    Err("响应中没有可识别的图片结果字段。".to_string())
}

fn extract_image_from_item(item: &Value) -> Result<GeneratedImage, String> {
    let revised_prompt = item
        .get("revised_prompt")
        .and_then(Value::as_str)
        .map(ToOwned::to_owned)
        .or_else(|| {
            item.get("prompt")
                .and_then(Value::as_str)
                .map(ToOwned::to_owned)
        });

    if let Some(encoded) = item.get("b64_json").and_then(Value::as_str) {
        return Ok(GeneratedImage {
            revised_prompt,
            source_type: "dataUrl".to_string(),
            src: build_data_url(encoded),
        });
    }

    if let Some(url) = item
        .get("url")
        .and_then(Value::as_str)
        .or_else(|| item.get("image").and_then(Value::as_str))
        .or_else(|| item.get("image_url").and_then(Value::as_str))
    {
        return Ok(GeneratedImage {
            revised_prompt,
            source_type: "url".to_string(),
            src: url.to_string(),
        });
    }

    Err("某张图片结果既没有 b64_json，也没有 url。".to_string())
}

fn build_data_url(encoded: &str) -> String {
    let mime_type = base64::engine::general_purpose::STANDARD
        .decode(encoded)
        .ok()
        .map(|bytes| guess_mime_type(&bytes).to_string())
        .unwrap_or_else(|| "image/png".to_string());

    format!("data:{mime_type};base64,{encoded}")
}

async fn cache_generated_images(
    app: &tauri::AppHandle,
    client: &reqwest::Client,
    images: Vec<GeneratedImage>,
) -> Vec<GeneratedImage> {
    let cache_dir = match app.path().app_cache_dir() {
        Ok(path) => path.join("generated-images"),
        Err(error) => {
            eprintln!("无法解析图片缓存目录：{error}");
            return images;
        }
    };
    if let Err(error) = std::fs::create_dir_all(&cache_dir) {
        eprintln!("无法创建图片缓存目录：{error}");
        return images;
    }

    let mut cached_images = Vec::with_capacity(images.len());
    for (index, mut image) in images.into_iter().enumerate() {
        if image.source_type != "url" && image.source_type != "dataUrl" {
            cached_images.push(image);
            continue;
        }

        let bytes = match load_generated_image_bytes(client, &image).await {
            Ok(bytes) => bytes,
            Err(error) => {
                // Keep the original source as a best-effort fallback. A cache failure
                // should not discard an otherwise successful generation response.
                eprintln!("缓存生成图片失败：{error}");
                cached_images.push(image);
                continue;
            }
        };
        let Some(extension) = image_extension(&bytes) else {
            eprintln!("缓存生成图片失败：响应内容不是受支持的 PNG、JPEG 或 WebP 图片");
            cached_images.push(image);
            continue;
        };

        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis();
        let sequence = IMAGE_FILE_SEQUENCE.fetch_add(1, Ordering::Relaxed);
        let filename = format!(
            "{timestamp}-{}-{sequence}-{index}.{extension}",
            std::process::id()
        );
        let file_path = cache_dir.join(filename);
        match std::fs::write(&file_path, bytes) {
            Ok(()) => {
                image.source_type = "file".to_string();
                image.src = file_path.to_string_lossy().to_string();
            }
            Err(error) => eprintln!("写入生成图片缓存失败：{error}"),
        }
        cached_images.push(image);
    }

    cached_images
}

async fn load_generated_image_bytes(
    client: &reqwest::Client,
    image: &GeneratedImage,
) -> Result<Vec<u8>, String> {
    if image.source_type == "dataUrl" {
        let (_, encoded) = image
            .src
            .split_once(',')
            .ok_or_else(|| "图片 data URL 格式无效".to_string())?;
        return base64::engine::general_purpose::STANDARD
            .decode(encoded.trim())
            .map_err(|error| format!("图片 Base64 解码失败：{error}"));
    }

    let url = reqwest::Url::parse(&image.src).map_err(|_| "图片 URL 格式无效".to_string())?;
    if !matches!(url.scheme(), "https" | "http") {
        return Err("仅支持缓存 HTTP(S) 图片".to_string());
    }
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|error| format!("下载生成图片失败：{error}"))?;
    if !response.status().is_success() {
        return Err(format!("下载生成图片失败：HTTP {}", response.status()));
    }
    if response
        .content_length()
        .is_some_and(|length| length > MAX_GENERATED_IMAGE_BYTES as u64)
    {
        return Err("生成图片超过 40MB 缓存限制".to_string());
    }
    let bytes = response
        .bytes()
        .await
        .map_err(|error| format!("读取生成图片失败：{error}"))?;
    if bytes.is_empty() || bytes.len() > MAX_GENERATED_IMAGE_BYTES {
        return Err("生成图片为空或超过 40MB 缓存限制".to_string());
    }
    Ok(bytes.to_vec())
}

fn image_extension(bytes: &[u8]) -> Option<&'static str> {
    if bytes.starts_with(&[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A]) {
        Some("png")
    } else if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        Some("jpg")
    } else if bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP") {
        Some("webp")
    } else {
        None
    }
}

fn guess_mime_type(bytes: &[u8]) -> &'static str {
    if bytes.starts_with(&[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A]) {
        "image/png"
    } else if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        "image/jpeg"
    } else if bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP") {
        "image/webp"
    } else {
        "image/png"
    }
}

fn extract_error_message(response_text: &str) -> String {
    let Ok(payload) = serde_json::from_str::<Value>(response_text) else {
        return trim_response(response_text);
    };

    payload
        .get("error")
        .and_then(|error| error.get("message"))
        .and_then(Value::as_str)
        .map(ToOwned::to_owned)
        .or_else(|| {
            payload
                .get("message")
                .and_then(Value::as_str)
                .map(ToOwned::to_owned)
        })
        .or_else(|| {
            payload
                .get("msg")
                .and_then(Value::as_str)
                .map(ToOwned::to_owned)
        })
        .unwrap_or_else(|| trim_response(response_text))
}

fn trim_response(value: &str) -> String {
    let mut chars = value.chars();
    let preview: String = chars.by_ref().take(280).collect();
    if chars.next().is_some() {
        format!("{preview}...")
    } else {
        preview
    }
}

mod media;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .register_uri_scheme_protocol("generated-image", |context, request| {
            let filename = request.uri().path().trim_start_matches('/');
            if filename.is_empty()
                || filename.contains("..")
                || !filename.chars().all(|character| {
                    character.is_ascii_alphanumeric() || matches!(character, '-' | '.')
                })
            {
                return tauri::http::Response::builder()
                    .status(400)
                    .body("Invalid generated image filename".as_bytes().to_vec())
                    .expect("valid error response");
            }

            let cache_dir = match context.app_handle().path().app_cache_dir() {
                Ok(path) => path.join("generated-images"),
                Err(_) => {
                    return tauri::http::Response::builder()
                        .status(500)
                        .body(Vec::new())
                        .expect("valid error response");
                }
            };
            match std::fs::read(cache_dir.join(filename)) {
                Ok(contents) => tauri::http::Response::builder()
                    .header("Content-Type", guess_mime_type(&contents))
                    .header("Access-Control-Allow-Origin", "*")
                    .header("Cache-Control", "public, max-age=31536000, immutable")
                    .body(contents)
                    .expect("valid generated image response"),
                Err(_) => tauri::http::Response::builder()
                    .status(404)
                    .body(Vec::new())
                    .expect("valid error response"),
            }
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            generate_images,
            get_model_profile,
            media::create_media_task,
            media::get_media_task,
            media::upload_media_image
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
