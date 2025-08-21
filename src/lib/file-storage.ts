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

// 전역 변수로 메모리 저장소 관리 (서버 재시작시 초기화됨)
declare global {
  var __fileStorage: Map<string, FileData> | undefined;
}

// 전역 저장소 초기화
if (!global.__fileStorage) {
  global.__fileStorage = new Map<string, FileData>();
}

export const FileStorage = {
  // 파일 저장
  store: (fileData: FileData): void => {
    const storage = global.__fileStorage!;
    storage.set(fileData.id, fileData);
    console.log(`파일 저장됨: ${fileData.filename}, 현재 저장된 파일 수: ${storage.size}`);
    
    // 1시간 후 자동 삭제 (메모리 절약)
    setTimeout(() => {
      storage.delete(fileData.id);
      console.log(`임시 파일 삭제됨: ${fileData.filename}, 남은 파일 수: ${storage.size}`);
    }, 60 * 60 * 1000); // 1시간
  },

  // 파일 조회
  get: (fileId: string): FileData | undefined => {
    const storage = global.__fileStorage!;
    const fileData = storage.get(fileId);
    console.log(`파일 조회: ${fileId}, 찾음: ${!!fileData}, 저장된 파일 수: ${storage.size}`);
    return fileData;
  },

  // 파일 삭제
  delete: (fileId: string): boolean => {
    const storage = global.__fileStorage!;
    const result = storage.delete(fileId);
    console.log(`파일 삭제: ${fileId}, 성공: ${result}, 남은 파일 수: ${storage.size}`);
    return result;
  },

  // 저장된 파일 개수 조회 (디버깅용)
  size: (): number => {
    const storage = global.__fileStorage!;
    return storage.size;
  }
};