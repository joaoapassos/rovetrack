import { describe, expect, it } from 'vitest'
import { createId3Tags } from './id3'

describe('política de álbum ID3', () => {
  it('preserva o álbum explicitamente escolhido pelo processador', () => {
    expect(
      createId3Tags({
        title: 'Song',
        artist: 'Artist',
        album: 'Playlist',
        coverImagePath: 'cover.jpg'
      }).album
    ).toBe('Playlist')
  })
})
