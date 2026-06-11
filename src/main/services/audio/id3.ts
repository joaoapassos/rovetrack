import NodeID3 from 'node-id3'

/**
 * Injeta fisicamente metadados e arquivos de arte (capa) no cabeçalho binário
 * do arquivo de áudio utilizando o padrão ID3v2.
 *
 * @param mp3Path Caminho absoluto do arquivo .mp3 bruto que receberá a estampa.
 * @param tags O payload TrackMetadata contendo o título, artista e o caminho da capa formatada.
 * @throws {Error} Se o arquivo de destino não puder ser escrito ou modificado.
 */
export function injectId3Tags(mp3Path: string, tags: TrackMetadata): void {
  const id3Tags: NodeID3.Tags = {
    title: tags.title,
    artist: tags.artist,
    image: tags.coverImagePath,
    album: tags.title
  }

  const success = NodeID3.write(id3Tags, mp3Path)
  if (!success) {
    throw new Error('[audio.injectId3Tags] Falha ao injetar as tags ID3 no ficheiro de áudio.')
  }
}