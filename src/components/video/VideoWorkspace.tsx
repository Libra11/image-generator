import { MediaWorkspace } from '@/components/modality/MediaWorkspace'
import type { MediaWorkspaceProps } from '@/lib/media'

export function VideoWorkspace(props: MediaWorkspaceProps) {
  return <MediaWorkspace kind="video" {...props} />
}
