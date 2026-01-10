import { useState, useEffect, useRef } from 'react';
import { useVersions } from '@features/versions/api/useVersions';
import type { Playlist } from '@shared/api/client';

interface PlaylistPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: Playlist;
}

interface PlaylistVideo {
  code: string;
  name: string;
  filePath: string;
  index: number;
}

export const PlaylistPlayerModal: React.FC<PlaylistPlayerModalProps> = ({
  isOpen,
  onClose,
  playlist,
}) => {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlistVideos, setPlaylistVideos] = useState<PlaylistVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [, setNextVideoReady] = useState(false);

  // Get all versions to find the ones in the playlist
  const { data: allVersions = [] } = useVersions();

  // Build playlist videos from versionCodes
  useEffect(() => {
    if (!isOpen || !allVersions.length || !playlist.versionCodes?.length) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const videos: PlaylistVideo[] = [];

      playlist.versionCodes.forEach((versionCode, index) => {
        const version = allVersions.find((v) => v.code === versionCode);
        if (version && version.filePath && version.code && version.name) {
          videos.push({
            code: version.code,
            name: version.name,
            filePath: version.filePath,
            index,
          });
        }
      });

      if (videos.length === 0) {
        setError('No videos found in this playlist. Make sure all versions have video files.');
      } else {
        setPlaylistVideos(videos);
        setCurrentVideoIndex(0);
      }
    } catch (err) {
      setError('Error loading playlist videos');
      console.error('Error building playlist videos:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, allVersions, playlist.versionCodes]);

  // Handle video end - move to next video smoothly
  const handleVideoEnd = () => {
    if (currentVideoIndex < playlistVideos.length - 1) {
      setIsTransitioning(true);
      // Small delay to ensure smooth transition
      setTimeout(() => {
        setCurrentVideoIndex((prev) => prev + 1);
        setIsTransitioning(false);
        setNextVideoReady(false);
      }, 100);
    } else {
      // End of playlist
      setIsPlaying(false);
    }
  };

  // Handle video play/pause
  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Handle next video
  const handleNext = () => {
    if (currentVideoIndex < playlistVideos.length - 1) {
      setCurrentVideoIndex((prev) => prev + 1);
    }
  };

  // Handle previous video
  const handlePrevious = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex((prev) => prev - 1);
    }
  };

  // Handle video selection
  const handleVideoSelect = (index: number) => {
    setCurrentVideoIndex(index);
  };

  // Auto-play when video changes
  useEffect(() => {
    if (videoRef.current && isPlaying && !isTransitioning) {
      // Ensure video is ready before playing
      const playVideo = () => {
        if (videoRef.current) {
          videoRef.current.play().catch(console.error);
        }
      };

      if (videoRef.current.readyState >= 3) {
        // Video is ready
        playVideo();
      } else {
        // Wait for video to be ready
        videoRef.current.addEventListener('canplay', playVideo, { once: true });
      }
    }
  }, [currentVideoIndex, isPlaying, isTransitioning]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentVideo = playlistVideos[currentVideoIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-90" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-6xl max-h-[95vh] w-full mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{playlist.name}</h2>
            <p className="text-sm text-gray-600">
              Video {currentVideoIndex + 1} of {playlistVideos.length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex">
          {/* Video Player */}
          <div className="flex-1 p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading playlist...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="text-red-500 text-4xl mb-2">⚠️</div>
                  <p className="text-red-600 font-medium">{error}</p>
                </div>
              </div>
            ) : currentVideo ? (
              <div className="space-y-4">
                {/* Current Video */}
                <div className="relative bg-black rounded-lg overflow-hidden">
                  {/* Transition overlay */}
                  {isTransitioning && (
                    <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center z-10">
                      <div className="text-center">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-white text-sm">Loading next scene...</p>
                      </div>
                    </div>
                  )}

                  <video
                    ref={videoRef}
                    src={currentVideo.filePath}
                    className={`w-full h-auto max-h-[60vh] object-contain transition-opacity duration-150 ${
                      isTransitioning ? 'opacity-90' : 'opacity-100'
                    }`}
                    controls
                    autoPlay
                    preload="auto"
                    onEnded={handleVideoEnd}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onError={(e) => {
                      console.error('Video failed to load:', e);
                      setError(`Failed to load video: ${currentVideo.name}`);
                    }}
                    onLoadedData={() => {
                      // Video is ready
                      if (isTransitioning) {
                        setIsTransitioning(false);
                      }
                    }}
                  />
                </div>

                {/* Video Info */}
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900">{currentVideo.name}</h3>
                  <p className="text-sm text-gray-600">{currentVideo.code}</p>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center space-x-4">
                  <button
                    onClick={handlePrevious}
                    disabled={currentVideoIndex === 0 || isTransitioning}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={handlePlayPause}
                    disabled={isTransitioning}
                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={currentVideoIndex === playlistVideos.length - 1 || isTransitioning}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <p className="text-gray-600">No video selected</p>
                </div>
              </div>
            )}
          </div>

          {/* Playlist Sidebar */}
          {playlistVideos.length > 0 && (
            <div className="w-80 border-l bg-gray-50 p-4">
              <h3 className="font-medium text-gray-900 mb-3">Playlist</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {playlistVideos.map((video, index) => (
                  <button
                    key={video.code}
                    onClick={() => handleVideoSelect(index)}
                    disabled={isTransitioning}
                    className={`w-full text-left p-3 rounded border transition-colors ${
                      index === currentVideoIndex
                        ? 'bg-blue-100 border-blue-300'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    } ${isTransitioning ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="text-sm font-medium text-gray-900">{video.name}</div>
                    <div className="text-xs text-gray-600">{video.code}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 rounded-b-lg">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Press ESC to close</span>
            <div className="flex items-center space-x-4">
              <span>
                {currentVideoIndex + 1} / {playlistVideos.length}
              </span>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
