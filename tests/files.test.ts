import { isImageFile, isVideoFile, isGifFile } from '../src/files';
import { expect } from 'chai';

describe('File Utils Tests', () => {
  describe('isImageFile', () => {
    it('should return true for image file extensions', () => {
      expect(isImageFile('image.jpg')).to.be.true;
      expect(isImageFile('photo.png')).to.be.true;
      expect(isImageFile('animated.gif')).to.be.true;
    });

    it('should return true for image file extensions with compound suffixes', () => {
      expect(isImageFile('image.backup.jpg')).to.be.true;
      expect(isImageFile('photo.original.png')).to.be.true;
      expect(isImageFile('animated.preview.gif')).to.be.true;
    });

    it('should return false for non-image file extensions', () => {
      expect(isImageFile('document.docx')).to.be.false;
      expect(isImageFile('video.mp4')).to.be.false;
      expect(isImageFile('audio.mp3')).to.be.false;
    });
  });

  describe('isVideoFile', () => {
    it('should return true for video file extensions', () => {
      expect(isVideoFile('video.mp4')).to.be.true;
      expect(isVideoFile('movie.avi')).to.be.true;
      expect(isVideoFile('clip.mov')).to.be.true;
    });

    it('should return true for video file extensions with compound suffixes', () => {
      expect(isVideoFile('video.trailer.mp4')).to.be.true;
      expect(isVideoFile('movie.hq.avi')).to.be.true;
      expect(isVideoFile('clip.mobile.mov')).to.be.true;
    });

    it('should return false for non-video file extensions', () => {
      expect(isVideoFile('image.jpg')).to.be.false;
      expect(isVideoFile('document.docx')).to.be.false;
      expect(isVideoFile('audio.mp3')).to.be.false;
    });
  });

  describe('isGifFile', () => {
    it('should return true for GIF file extension', () => {
      expect(isGifFile('animated.gif')).to.be.true;
    });

    it('should return true for GIF file extension with compound suffixes', () => {
      expect(isGifFile('animated.preview.gif')).to.be.true;
      expect(isGifFile('animated.original.gif')).to.be.true;
    });

    it('should return false for non-GIF file extensions', () => {
      expect(isGifFile('image.jpg')).to.be.false;
      expect(isGifFile('video.mp4')).to.be.false;
      expect(isGifFile('document.docx')).to.be.false;
    });
  });
});
