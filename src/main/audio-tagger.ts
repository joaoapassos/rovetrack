import NodeID3 from 'node-id3'

export interface AudioTags {
  title: string
  artist: string
  coverImagePath: string
}

export function tagMp3(mp3Path: string, tags: AudioTags): void {
  const id3Tags: NodeID3.Tags = {
    title: tags.title,
    artist: tags.artist,
    image: tags.coverImagePath,
    album: tags.title,
  }

  const success = NodeID3.write(id3Tags, mp3Path)
  if (!success) {
    throw new Error('Falha ao injetar as tags ID3 no arquivo de áudio.')
  }
}