/**
 * 큰 파일을 청크 단위로 나누어 업로드하는 유틸리티
 * Vercel의 4.5MB 제한을 우회하기 위해 사용
 */

export interface ChunkUploadOptions {
  file: File;
  chunkSize?: number; // 기본 2MB
  onProgress?: (progress: number, uploadedChunks: number, totalChunks: number) => void;
  onError?: (error: Error) => void;
  authToken: string;
}

export interface ChunkUploadResult {
  success: boolean;
  fileUrl?: string;
  filename?: string;
  size?: number;
  error?: string;
}

export class ChunkUploader {
  private static readonly DEFAULT_CHUNK_SIZE = 2 * 1024 * 1024; // 2MB

  static async upload(options: ChunkUploadOptions): Promise<ChunkUploadResult> {
    const {
      file,
      chunkSize = ChunkUploader.DEFAULT_CHUNK_SIZE,
      onProgress,
      onError,
      authToken
    } = options;

    try {
      // 파일을 청크로 나누기
      const totalChunks = Math.ceil(file.size / chunkSize);
      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(2)}`;

      console.log(`파일을 ${totalChunks}개 청크로 나누어 업로드 시작:`, file.name);

      // 각 청크를 순차적으로 업로드
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        console.log(`청크 ${chunkIndex + 1}/${totalChunks} 업로드 중... (${start}-${end})`);

        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('chunkIndex', chunkIndex.toString());
        formData.append('totalChunks', totalChunks.toString());
        formData.append('filename', file.name);
        formData.append('fileSize', file.size.toString());
        formData.append('uploadId', uploadId);

        const response = await fetch('/api/upload-chunk', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `청크 ${chunkIndex + 1} 업로드 실패`);
        }

        const result = await response.json();

        // 진행상황 콜백 호출
        const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
        onProgress?.(progress, chunkIndex + 1, totalChunks);

        // 마지막 청크이고 완료되었다면 결과 반환
        if (result.complete) {
          console.log('청크 업로드 완료:', result.fileId);
          return {
            success: true,
            fileId: result.fileId,  // fileId 반환
            fileUrl: result.fileId, // 호환성을 위해 fileUrl에도 fileId 저장
            filename: result.filename,
            size: result.size
          };
        }
      }

      throw new Error('업로드가 완료되지 않았습니다.');

    } catch (error) {
      console.error('청크 업로드 오류:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      onError?.(error instanceof Error ? error : new Error(errorMessage));
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 파일이 청크 업로드가 필요한지 확인
   * @param file 확인할 파일
   * @param threshold 임계값 (기본 4MB)
   * @returns 청크 업로드 필요 여부
   */
  static needsChunking(file: File, threshold = 4 * 1024 * 1024): boolean {
    return file.size > threshold;
  }

  /**
   * 업로드 진행상황 조회
   * @param uploadId 업로드 ID
   * @returns 진행상황
   */
  static async getProgress(uploadId: string) {
    try {
      const response = await fetch(`/api/upload-chunk?uploadId=${uploadId}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('진행상황 조회 오류:', error);
      return null;
    }
  }
}