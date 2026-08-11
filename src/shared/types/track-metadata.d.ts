/**
 * Representa os metadados da faixa de áudio.
 */
declare interface TrackMetadata {
  /**
   * O nome da música ou título do vídeo.
   * Usado para a tag 'Title' e, por padrão, para a tag 'Album'.
   */
  title: string

  /**
   * O nome do criador, banda ou canal do YouTube.
   * Usado para a tag 'Artist'.
   */
  artist: string

  /**
   * O caminho absoluto imagem de capa
   * @example "C:/Users/Nome/Downloads/RoveTrack/temp_cover.jpg"
   */
  coverImagePath: string

  /** Nome da playlist de origem, quando a faixa fizer parte de uma playlist. */
  playlistTitle?: string
}
