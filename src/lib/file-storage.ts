/**
 * 파일시스템 기반 파일 저장소
 * 로컬 환경에서 안정적인 파일 처리를 위한 구현
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);
// const readdir = promisify(fs.readdir); // 현재 사용되지 않음

interface FileData {
  id: string;
  filename: string;
  size: number;
  contentType: string;
  filePath: string;
  uploadedAt: string;
  status: 'uploading' | 'complete' | 'processing' | 'ready';
}

// 디렉토리 설정
const BASE_DIR = process.cwd();
const UPLOAD_DIR = path.join(BASE_DIR, 'uploads');
const TEMP_DIR = path.join(BASE_DIR, 'temp');  
const PROCESSED_DIR = path.join(BASE_DIR, 'processed');
const CHUNKS_DIR = path.join(BASE_DIR, 'chunks');

// 디렉토리 초기화
const initDirectories = async () => {
  const dirs = [UPLOAD_DIR, TEMP_DIR, PROCESSED_DIR, CHUNKS_DIR];
  
  for (const dir of dirs) {
    try {
      await mkdir(dir, { recursive: true });
    } catch {
      console.log(`디렉토리 이미 존재: ${dir}`);
    }
  }
};

// 메타데이터 저장 (JSON 파일 기반)
const METADATA_FILE = path.join(BASE_DIR, 'file-metadata.json');

const loadMetadata = async (): Promise<Map<string, FileData>> => {
  try {
    const data = await readFile(METADATA_FILE, 'utf8');
    const parsed = JSON.parse(data);
    return new Map(Object.entries(parsed));
  } catch {
    return new Map();
  }
};

const saveMetadata = async (metadata: Map<string, FileData>): Promise<void> => {
  const obj = Object.fromEntries(metadata.entries());
  await writeFile(METADATA_FILE, JSON.stringify(obj, null, 2));
};

export const FileStorage = {
  // 초기화
  init: async (): Promise<void> => {
    await initDirectories();
    console.log('파일 저장소 초기화 완료');
  },

  // 파일 저장
  store: async (fileData: Omit<FileData, 'filePath'>, buffer: Buffer): Promise<FileData> => {
    await initDirectories();
    
    const filePath = path.join(UPLOAD_DIR, `${fileData.id}_${fileData.filename}`);
    const fullFileData: FileData = { ...fileData, filePath, status: 'complete' };
    
    // 파일 저장
    await writeFile(filePath, buffer);
    
    // 메타데이터 업데이트
    const metadata = await loadMetadata();
    metadata.set(fileData.id, fullFileData);
    await saveMetadata(metadata);
    
    console.log(`파일 저장됨: ${fileData.filename} (${buffer.length} bytes)`);
    
    // 24시간 후 자동 삭제
    setTimeout(async () => {
      try {
        await FileStorage.delete(fileData.id);
        console.log(`임시 파일 자동 삭제됨: ${fileData.filename}`);
      } catch (error) {
        console.error(`자동 삭제 실패: ${fileData.filename}`, error);
      }
    }, 24 * 60 * 60 * 1000); // 24시간
    
    return fullFileData;
  },

  // 청크 저장 
  storeChunk: async (uploadId: string, chunkIndex: number, buffer: Buffer): Promise<void> => {
    await initDirectories();
    const chunkPath = path.join(CHUNKS_DIR, `${uploadId}_chunk_${chunkIndex}`);
    await writeFile(chunkPath, buffer);
  },

  // 청크 병합
  mergeChunks: async (uploadId: string, totalChunks: number, filename: string): Promise<{ filePath: string; size: number }> => {
    const chunks: Buffer[] = [];
    
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(CHUNKS_DIR, `${uploadId}_chunk_${i}`);
      const chunkBuffer = await readFile(chunkPath);
      chunks.push(chunkBuffer);
    }
    
    const mergedBuffer = Buffer.concat(chunks);
    const filePath = path.join(UPLOAD_DIR, `${uploadId}_${filename}`);
    await writeFile(filePath, mergedBuffer);
    
    // 청크 파일들 정리
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(CHUNKS_DIR, `${uploadId}_chunk_${i}`);
      try {
        await unlink(chunkPath);
      } catch (error) {
        console.error(`청크 삭제 실패: ${chunkPath}`, error);
      }
    }
    
    return { filePath, size: mergedBuffer.length };
  },

  // 파일 조회
  get: async (fileId: string): Promise<FileData | undefined> => {
    const metadata = await loadMetadata();
    const fileData = metadata.get(fileId);
    
    if (fileData) {
      // 파일이 실제로 존재하는지 확인
      try {
        await stat(fileData.filePath);
        console.log(`파일 조회 성공: ${fileData.filename}`);
        return fileData;
      } catch {
        // 파일이 없으면 메타데이터에서도 제거
        metadata.delete(fileId);
        await saveMetadata(metadata);
        console.log(`파일 메타데이터 정리: ${fileId}`);
        return undefined;
      }
    }
    
    console.log(`파일 조회 실패: ${fileId}`);
    return undefined;
  },

  // 파일 읽기
  readFile: async (fileId: string): Promise<Buffer | undefined> => {
    const fileData = await FileStorage.get(fileId);
    if (!fileData) return undefined;
    
    try {
      return await readFile(fileData.filePath);
    } catch (error) {
      console.error(`파일 읽기 실패: ${fileData.filename}`, error);
      return undefined;
    }
  },

  // 처리된 파일 저장
  storeProcessed: async (originalFileId: string, processedBuffer: Buffer, suffix: string = '_processed'): Promise<string> => {
    await initDirectories();
    const originalFile = await FileStorage.get(originalFileId);
    if (!originalFile) throw new Error('원본 파일을 찾을 수 없습니다');
    
    const processedId = `${originalFileId}${suffix}`;
    const processedFilename = originalFile.filename.replace('.pptx', `${suffix}.pptx`);
    const processedPath = path.join(PROCESSED_DIR, `${processedId}_${processedFilename}`);
    
    await writeFile(processedPath, processedBuffer);
    
    const processedFileData: FileData = {
      id: processedId,
      filename: processedFilename,
      size: processedBuffer.length,
      contentType: originalFile.contentType,
      filePath: processedPath,
      uploadedAt: new Date().toISOString(),
      status: 'ready'
    };
    
    const metadata = await loadMetadata();
    metadata.set(processedId, processedFileData);
    await saveMetadata(metadata);
    
    console.log(`처리된 파일 저장됨: ${processedFilename}`);
    
    // 1시간 후 자동 삭제 
    setTimeout(async () => {
      try {
        await FileStorage.delete(processedId);
        console.log(`처리된 파일 자동 삭제됨: ${processedFilename}`);
      } catch (error) {
        console.error(`처리된 파일 삭제 실패: ${processedFilename}`, error);
      }
    }, 60 * 60 * 1000); // 1시간
    
    return processedId;
  },

  // 파일 삭제
  delete: async (fileId: string): Promise<boolean> => {
    const metadata = await loadMetadata();
    const fileData = metadata.get(fileId);
    
    if (!fileData) {
      console.log(`삭제할 파일 메타데이터 없음: ${fileId}`);
      return false;
    }
    
    try {
      // 실제 파일 삭제
      await unlink(fileData.filePath);
      console.log(`파일 삭제됨: ${fileData.filename}`);
    } catch (error) {
      console.error(`파일 삭제 실패: ${fileData.filename}`, error);
    }
    
    // 메타데이터에서 제거
    metadata.delete(fileId);
    await saveMetadata(metadata);
    
    return true;
  },

  // 정리 작업 (오래된 파일들 삭제)
  cleanup: async (maxAgeHours: number = 24): Promise<void> => {
    const metadata = await loadMetadata();
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000;
    
    for (const [fileId, fileData] of metadata.entries()) {
      const uploadTime = new Date(fileData.uploadedAt).getTime();
      if (now - uploadTime > maxAge) {
        await FileStorage.delete(fileId);
        console.log(`오래된 파일 정리: ${fileData.filename}`);
      }
    }
  },

  // 저장된 파일 개수 조회
  size: async (): Promise<number> => {
    const metadata = await loadMetadata();
    return metadata.size;
  },

  // 디스크 사용량 조회
  getDiskUsage: async (): Promise<{ files: number; totalSize: number }> => {
    const metadata = await loadMetadata();
    let totalSize = 0;
    
    for (const fileData of metadata.values()) {
      try {
        const stats = await stat(fileData.filePath);
        totalSize += stats.size;
      } catch {
        // 파일이 없으면 무시
      }
    }
    
    return { files: metadata.size, totalSize };
  }
};