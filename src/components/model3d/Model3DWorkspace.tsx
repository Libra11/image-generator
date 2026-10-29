import { MediaWorkspace } from '@/components/modality/MediaWorkspace'
import type { MediaWorkspaceProps } from '@/lib/media'

export function Model3DWorkspace(props: MediaWorkspaceProps) {
  return <MediaWorkspace kind="model3d" {...props} />
}
