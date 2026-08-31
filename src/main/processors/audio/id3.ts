import NodeID3 from 'node-id3'

export interface AudioTags {
  title: string
  artist: string
  album: string
  coverImagePath: string
}

export function createId3Tags(tags: AudioTags): NodeID3.Tags {
  return {
    title: tags.title,
    artist: tags.artist,
    album: tags.album,
    image: tags.coverImagePath
  }
}

export function injectId3Tags(mp3Path: string, tags: AudioTags): void {
  if (!NodeID3.write(createId3Tags(tags), mp3Path)) {
    throw new Error('Falha ao gravar as tags ID3 no ficheiro de áudio.')
  }
}
