/**
 * 간단한 메모리 기반 파일 저장소
 * 실제 프로덕션에서는 데이터베이스나 클라우드 저장소를 사용해야 합니다.
 */

interface FileData {
  id: string;
  filename: string;
  size: number;
  contentType: string;
  data: string; // base64 encoded
  uploadedAt: string;
}

// 메모리 저장소 (서버 재시작시 초기화됨)
const fileStorage = new Map<string, FileData>();

export const FileStorage = {
  // 파일 저장
  store: (fileData: FileData): void => {
    fileStorage.set(fileData.id, fileData);
    
    // 1시간 후 자동 삭제 (메모리 절약)
    setTimeout(() => {
      fileStorage.delete(fileData.id);
      console.log(`임시 파일 삭제됨: ${fileData.filename}`);
    }, 60 * 60 * 1000); // 1시간
  },

  // 파일 조회
  get: (fileId: string): FileData | undefined => {
    return fileStorage.get(fileId);
  },

  // 파일 삭제
  delete: (fileId: string): boolean => {
    return fileStorage.delete(fileId);
  },

  // 저장된 파일 개수 조회 (디버깅용)
  size: (): number => {
    return fileStorage.size;
  }
};