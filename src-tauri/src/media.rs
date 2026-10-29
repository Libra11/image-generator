use base64::Engine;
use reqwest::Client;
use serde::Deserialize;
use serde_json::{json, Value};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaRequest {
    api_key: Option<String>,
    base_url: Option<String>,
    model: String,
    prompt: String,
    image: String,
    last_frame: String,
    duration: u8,
    resolution: String,
    ratio: String,
    texture: bool,
    texture_quality: String,
    geometry_quality: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskRequest {
    api_key: Option<String>,
    base_url: Option<String>,
    task_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadRequest {
    api_key: Option<String>,
    base_url: Option<String>,
    model: String,
    filename: String,
    data_base64: String,
}

fn api_root(base: &str) -> Result<String, String> {
    let mut url = reqwest::Url::parse(base.trim()).map_err(|_| "Base URL 格式无效")?;
    if url.scheme() != "https" || url.host_str().is_none() {
        return Err("Base URL 必须使用 HTTPS".into());
    }
    let path = url.path().trim_end_matches('/');
    if !matches!(path, "" | "/compatible-mode/v1" | "/api/v1") {
        return Err("Base URL 请填写域名或以 /compatible-mode/v1、/api/v1 结尾的地址".into());
    }
    url.set_path("/api/v1");
    url.set_query(None);
    url.set_fragment(None);
    Ok(url.to_string())
}

fn image_url(value: &str) -> Result<(), String> {
    let url = reqwest::Url::parse(value).map_err(|_| "参考图请填写公网 HTTP(S) URL")?;
    if !matches!(url.scheme(), "https" | "http") || url.host_str().is_none() {
        return Err("参考图请填写公网 HTTP(S) URL".into());
    }
    Ok(())
}

fn build_body(r: &MediaRequest) -> Result<(&'static str, Value), String> {
    let prompt = r.prompt.trim();
    let image = r.image.trim();
    let mut input = json!({});
    let parameters;
    let endpoint;
    match r.model.as_str() {
        "wan2.7-t2v" | "wan2.7-i2v" => {
            endpoint = "video-synthesis";
            if !(2..=15).contains(&r.duration) || !matches!(r.resolution.as_str(), "720P" | "1080P")
            {
                return Err("视频需选择 2–15 秒、720P 或 1080P".into());
            }
            if prompt.chars().count() > 5000 {
                return Err("视频提示词不能超过 5000 字".into());
            }
            input["prompt"] = json!(prompt);
            let mut params =
                json!({"duration": r.duration, "resolution": r.resolution, "prompt_extend": true});
            if r.model == "wan2.7-t2v" {
                if prompt.is_empty() || !image.is_empty() || !r.last_frame.is_empty() {
                    return Err("文生视频需要提示词，且不能携带参考图".into());
                }
                if !matches!(r.ratio.as_str(), "16:9" | "9:16" | "1:1" | "4:3" | "3:4") {
                    return Err("不支持的视频画幅".into());
                }
                params["ratio"] = json!(r.ratio);
            } else {
                image_url(image)?;
                let mut media = vec![json!({"type": "first_frame", "url": image})];
                if !r.last_frame.trim().is_empty() {
                    image_url(r.last_frame.trim())?;
                    media.push(json!({"type": "last_frame", "url": r.last_frame.trim()}));
                }
                input["media"] = json!(media);
            }
            parameters = params;
        }
        "Tripo/Tripo-P1.0" | "Tripo/Tripo-H3.1" => {
            endpoint = "3d-generation";
            if image.is_empty() {
                if prompt.is_empty() || prompt.chars().count() > 1024 {
                    return Err("3D 提示词需为 1–1024 字".into());
                }
                input["prompt"] = json!(prompt);
            } else {
                image_url(image)?;
                if !prompt.is_empty() {
                    return Err("Tripo 的文字和图片输入互斥".into());
                }
                input["image"] = json!(image);
            }
            if !matches!(r.texture_quality.as_str(), "standard" | "detailed")
                || !matches!(r.geometry_quality.as_str(), "standard" | "ultra")
            {
                return Err("不支持的模型质量参数".into());
            }
            let mut params = json!({"texture": r.texture, "pbr": r.texture, "texture_quality": r.texture_quality});
            if r.model == "Tripo/Tripo-H3.1" {
                params["geometry_quality"] = json!(r.geometry_quality);
            }
            parameters = params;
        }
        _ => return Err("不支持的媒体模型".into()),
    }
    Ok((
        endpoint,
        json!({"model": r.model, "input": input, "parameters": parameters}),
    ))
}

async fn response_json(response: reqwest::Response) -> Result<Value, String> {
    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|e| format!("读取响应失败：{e}"))?;
    if !status.is_success() {
        return Err(format!(
            "DashScope HTTP {status}：{}",
            super::extract_error_message(&text)
        ));
    }
    let payload: Value = serde_json::from_str(&text).map_err(|_| "服务返回了非 JSON 响应")?;
    if payload.get("code").is_some() {
        return Err(super::extract_error_message(&text));
    }
    if payload
        .pointer("/output/task_id")
        .and_then(Value::as_str)
        .filter(|s| !s.is_empty())
        .is_none()
        || payload
            .pointer("/output/task_status")
            .and_then(Value::as_str)
            .is_none()
    {
        return Err("服务响应缺少任务 ID 或状态".into());
    }
    Ok(payload)
}

fn client() -> Result<Client, String> {
    Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_media_task(request: MediaRequest) -> Result<Value, String> {
    let (endpoint, body) = build_body(&request)?;
    let http = client()?;
    if request.model.starts_with("Tripo/") && !request.image.trim().is_empty() {
        let check = http
            .get(request.image.trim())
            .send()
            .await
            .map_err(|e| format!("参考图 URL 无法访问：{e}"))?;
        if !check.status().is_success() {
            return Err(format!(
                "参考图 URL 无法公开访问（HTTP {}）。请更换为无需登录或鉴权即可访问的图片地址",
                check.status()
            ));
        }
    }
    let root = api_root(&super::resolve_base_url(request.base_url))?;
    let key = super::resolve_api_key(request.api_key)?;
    let response = http
        .post(format!("{root}/services/aigc/video-generation/{endpoint}"))
        .bearer_auth(key)
        .header("X-DashScope-Async", "enable")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("提交任务失败（请勿盲目重复提交，可在百炼控制台核对）：{e}"))?;
    response_json(response).await
}

#[tauri::command]
pub async fn get_media_task(request: TaskRequest) -> Result<Value, String> {
    if request.task_id.is_empty()
        || !request
            .task_id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-')
    {
        return Err("任务 ID 格式无效".into());
    }
    let root = api_root(&super::resolve_base_url(request.base_url))?;
    let key = super::resolve_api_key(request.api_key)?;
    let response = client()?
        .get(format!("{root}/tasks/{}", request.task_id))
        .bearer_auth(key)
        .send()
        .await
        .map_err(|e| format!("查询任务失败：{e}"))?;
    response_json(response).await
}

#[tauri::command]
pub async fn upload_media_image(request: UploadRequest) -> Result<String, String> {
    if !matches!(
        request.model.as_str(),
        "wan2.7-t2v" | "wan2.7-i2v" | "Tripo/Tripo-P1.0" | "Tripo/Tripo-H3.1"
    ) {
        return Err("不支持的媒体模型".into());
    }
    if request.model.starts_with("Tripo/") {
        return Err(
            "Tripo 图生 3D 请使用公网图片 URL；百炼临时上传为私有链接，不能作为参考图".into(),
        );
    }
    let name = request.filename.trim();
    let ext = name
        .rsplit('.')
        .next()
        .unwrap_or_default()
        .to_ascii_lowercase();
    if name.is_empty() || !matches!(ext.as_str(), "png" | "jpg" | "jpeg" | "webp" | "bmp") {
        return Err("仅支持 PNG / JPEG / WebP / BMP 图片".into());
    }
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(request.data_base64.trim())
        .map_err(|_| "图片数据无效")?;
    if bytes.is_empty() || bytes.len() > 20 * 1024 * 1024 {
        return Err("图片大小需在 20MB 以内".into());
    }
    let root = api_root(&super::resolve_base_url(request.base_url))?;
    let key = super::resolve_api_key(request.api_key)?;
    let http = client()?;

    // 1. 获取临时上传凭证
    let response = http
        .get(format!("{root}/uploads"))
        .query(&[("action", "getPolicy"), ("model", request.model.as_str())])
        .bearer_auth(&key)
        .send()
        .await
        .map_err(|e| format!("获取上传凭证失败：{e}"))?;
    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|e| format!("读取响应失败：{e}"))?;
    if !status.is_success() {
        return Err(format!(
            "获取上传凭证失败 HTTP {status}：{}",
            super::extract_error_message(&text)
        ));
    }
    let payload: Value = serde_json::from_str(&text).map_err(|_| "服务返回了非 JSON 响应")?;
    let data = payload.get("data").ok_or("上传凭证响应缺少 data 字段")?;
    let field = |k: &str| -> Result<String, String> {
        data.get(k)
            .and_then(Value::as_str)
            .filter(|s| !s.is_empty())
            .map(str::to_owned)
            .ok_or_else(|| format!("上传凭证缺少 {k}"))
    };
    let host = field("upload_host")?;
    let dir = field("upload_dir")?;
    let policy = field("policy")?;
    let signature = field("signature")?;
    let access_key_id = field("oss_access_key_id")?;

    // 2. 直传 OSS，返回供视频生成服务使用的临时参考图 URL
    let safe_name: String = name
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_') {
                c
            } else {
                '_'
            }
        })
        .collect();
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let object_key = format!("{dir}/{stamp}-{safe_name}");
    let mime = match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        _ => "image/bmp",
    };
    let file_part = reqwest::multipart::Part::bytes(bytes)
        .file_name(safe_name)
        .mime_str(mime)
        .map_err(|e| e.to_string())?;
    let form = reqwest::multipart::Form::new()
        .text("OSSAccessKeyId", access_key_id)
        .text("Signature", signature)
        .text("policy", policy)
        .text("key", object_key.clone())
        .text("x-oss-object-acl", "private")
        .text("x-oss-forbid-overwrite", "true")
        .text("success_action_status", "200")
        .part("file", file_part);
    let upload = http
        .post(&host)
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("上传图片失败：{e}"))?;
    if !upload.status().is_success() {
        let body = upload.text().await.unwrap_or_default();
        return Err(format!(
            "上传图片失败：{}",
            super::extract_error_message(&body)
        ));
    }
    Ok(format!("{}/{}", host.trim_end_matches('/'), object_key))
}

#[cfg(test)]
mod tests {
    use super::*;
    fn request(model: &str) -> MediaRequest {
        MediaRequest {
            api_key: None,
            base_url: None,
            model: model.into(),
            prompt: "小猫".into(),
            image: "".into(),
            last_frame: "".into(),
            duration: 5,
            resolution: "720P".into(),
            ratio: "16:9".into(),
            texture: false,
            texture_quality: "standard".into(),
            geometry_quality: "ultra".into(),
        }
    }
    #[test]
    fn native_roots() {
        for path in ["", "/api/v1/", "/compatible-mode/v1"] {
            assert_eq!(
                api_root(&format!("https://dashscope.aliyuncs.com{path}")).unwrap(),
                "https://dashscope.aliyuncs.com/api/v1"
            );
        }
        assert!(api_root("http://example.com").is_err());
    }
    #[test]
    fn video_frames_use_new_protocol() {
        let mut r = request("wan2.7-i2v");
        assert!(build_body(&r).is_err());
        r.image = "https://example.com/first.png".into();
        r.last_frame = "https://example.com/last.png".into();
        let (_, body) = build_body(&r).unwrap();
        assert_eq!(body["input"]["media"][1]["type"], "last_frame");
        assert!(body["parameters"].get("ratio").is_none());
        r.duration = 16;
        assert!(build_body(&r).is_err());
    }
    #[test]
    fn tripo_exclusive_inputs_and_capabilities() {
        let mut r = request("Tripo/Tripo-P1.0");
        let (_, body) = build_body(&r).unwrap();
        assert_eq!(body["parameters"]["pbr"], false);
        assert!(body["parameters"].get("geometry_quality").is_none());
        r.image = "https://example.com/cat.png".into();
        assert!(build_body(&r).is_err());
        r.prompt.clear();
        assert!(build_body(&r).unwrap().1["input"].get("prompt").is_none());
    }
}
