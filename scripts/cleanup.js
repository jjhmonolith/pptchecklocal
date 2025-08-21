#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧹 PPT 맞춤법 검사기 파일 정리를 시작합니다...');
console.log('');

// 파일 크기를 사람이 읽기 쉬운 형태로 변환
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 디렉토리 내용 삭제
function cleanDirectory(dirPath, dirName) {
  if (!fs.existsSync(dirPath)) {
    console.log(`   ℹ️  ${dirName}/ 디렉토리가 존재하지 않습니다.`);
    return { files: 0, size: 0 };
  }
  
  const files = fs.readdirSync(dirPath);
  let deletedFiles = 0;
  let deletedSize = 0;
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isFile()) {
      deletedSize += stat.size;
      fs.unlinkSync(filePath);
      deletedFiles++;
    } else if (stat.isDirectory()) {
      // 하위 디렉토리도 재귀적으로 삭제
      const subResult = cleanDirectory(filePath, `${dirName}/${file}`);
      deletedFiles += subResult.files;
      deletedSize += subResult.size;
      
      // 빈 디렉토리 삭제
      try {
        fs.rmdirSync(filePath);
      } catch (err) {
        // 비어있지 않은 디렉토리는 무시
      }
    }
  });
  
  if (deletedFiles > 0) {
    console.log(`   🗑️  ${dirName}/ : ${deletedFiles}개 파일 삭제됨 (${formatFileSize(deletedSize)})`);
  } else {
    console.log(`   ✨ ${dirName}/ : 삭제할 파일이 없습니다.`);
  }
  
  return { files: deletedFiles, size: deletedSize };
}

// 특정 확장자 파일 정리
function cleanFilesByExtension(dirPath, extensions, description) {
  if (!fs.existsSync(dirPath)) {
    return { files: 0, size: 0 };
  }
  
  const files = fs.readdirSync(dirPath);
  let deletedFiles = 0;
  let deletedSize = 0;
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isFile() && extensions.some(ext => file.toLowerCase().endsWith(ext))) {
      deletedSize += stat.size;
      fs.unlinkSync(filePath);
      deletedFiles++;
    }
  });
  
  if (deletedFiles > 0) {
    console.log(`   🗑️  ${description} : ${deletedFiles}개 파일 삭제됨 (${formatFileSize(deletedSize)})`);
  }
  
  return { files: deletedFiles, size: deletedSize };
}

// 오래된 파일 정리
function cleanOldFiles(dirPath, maxAgeHours, description) {
  if (!fs.existsSync(dirPath)) {
    return { files: 0, size: 0 };
  }
  
  const files = fs.readdirSync(dirPath);
  const now = Date.now();
  const maxAge = maxAgeHours * 60 * 60 * 1000;
  
  let deletedFiles = 0;
  let deletedSize = 0;
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isFile() && (now - stat.mtime.getTime()) > maxAge) {
      deletedSize += stat.size;
      fs.unlinkSync(filePath);
      deletedFiles++;
    }
  });
  
  if (deletedFiles > 0) {
    console.log(`   🗑️  ${description} : ${deletedFiles}개 파일 삭제됨 (${formatFileSize(deletedSize)})`);
  }
  
  return { files: deletedFiles, size: deletedSize };
}

// 로그 파일 정리
function cleanLogFiles() {
  const logDir = path.join(process.cwd(), 'logs');
  console.log('📄 로그 파일을 정리합니다...');
  
  // 7일 이상 된 로그 파일 삭제
  const result = cleanOldFiles(logDir, 24 * 7, '오래된 로그 파일');
  
  return result;
}

// 임시 파일 정리
function cleanTempFiles() {
  console.log('📁 임시 파일들을 정리합니다...');
  
  const dirs = [
    { path: path.join(process.cwd(), 'temp'), name: 'temp' },
    { path: path.join(process.cwd(), 'chunks'), name: 'chunks' }
  ];
  
  let totalFiles = 0;
  let totalSize = 0;
  
  dirs.forEach(({ path: dirPath, name }) => {
    const result = cleanDirectory(dirPath, name);
    totalFiles += result.files;
    totalSize += result.size;
  });
  
  return { files: totalFiles, size: totalSize };
}

// 처리된 파일 정리 (24시간 이상)
function cleanProcessedFiles() {
  console.log('📄 처리된 파일들을 정리합니다...');
  
  const processedDir = path.join(process.cwd(), 'processed');
  const uploadsDir = path.join(process.cwd(), 'uploads');
  
  let totalFiles = 0;
  let totalSize = 0;
  
  // 24시간 이상 된 처리된 파일들 삭제
  const processedResult = cleanOldFiles(processedDir, 24, '오래된 처리 파일');
  totalFiles += processedResult.files;
  totalSize += processedResult.size;
  
  // 48시간 이상 된 업로드 파일들 삭제  
  const uploadsResult = cleanOldFiles(uploadsDir, 48, '오래된 업로드 파일');
  totalFiles += uploadsResult.files;
  totalSize += uploadsResult.size;
  
  return { files: totalFiles, size: totalSize };
}

// 메타데이터 파일 정리
function cleanMetadata() {
  console.log('🗃️  메타데이터를 정리합니다...');
  
  const metadataPath = path.join(process.cwd(), 'file-metadata.json');
  
  if (!fs.existsSync(metadataPath)) {
    console.log('   ℹ️  메타데이터 파일이 존재하지 않습니다.');
    return;
  }
  
  try {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    const now = Date.now();
    const maxAge = 48 * 60 * 60 * 1000; // 48시간
    
    let cleanedEntries = 0;
    const cleanedMetadata = {};
    
    Object.entries(metadata).forEach(([fileId, fileData]) => {
      const uploadTime = new Date(fileData.uploadedAt).getTime();
      const filePath = fileData.filePath;
      
      // 파일이 존재하고 48시간 이내인 경우만 유지
      if ((now - uploadTime) <= maxAge && fs.existsSync(filePath)) {
        cleanedMetadata[fileId] = fileData;
      } else {
        cleanedEntries++;
        // 실제 파일도 삭제 시도
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          // 파일 삭제 실패는 무시
        }
      }
    });
    
    fs.writeFileSync(metadataPath, JSON.stringify(cleanedMetadata, null, 2));
    
    if (cleanedEntries > 0) {
      console.log(`   🗑️  메타데이터 : ${cleanedEntries}개 항목 정리됨`);
    } else {
      console.log('   ✨ 메타데이터 : 정리할 항목이 없습니다.');
    }
    
  } catch (error) {
    console.log('   ❌ 메타데이터 정리 중 오류:', error.message);
  }
}

// 시스템 파일 정리
function cleanSystemFiles() {
  console.log('🖥️  시스템 파일을 정리합니다...');
  
  const rootDir = process.cwd();
  let totalFiles = 0;
  let totalSize = 0;
  
  // macOS 시스템 파일
  const macFiles = ['.DS_Store', '._.DS_Store'];
  macFiles.forEach(fileName => {
    const filePath = path.join(rootDir, fileName);
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      fs.unlinkSync(filePath);
      totalFiles++;
      totalSize += stat.size;
    }
  });
  
  // Windows 시스템 파일
  const winFiles = ['Thumbs.db', 'Desktop.ini'];
  winFiles.forEach(fileName => {
    const filePath = path.join(rootDir, fileName);
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      fs.unlinkSync(filePath);
      totalFiles++;
      totalSize += stat.size;
    }
  });
  
  if (totalFiles > 0) {
    console.log(`   🗑️  시스템 파일 : ${totalFiles}개 파일 삭제됨 (${formatFileSize(totalSize)})`);
  } else {
    console.log('   ✨ 시스템 파일 : 삭제할 파일이 없습니다.');
  }
  
  return { files: totalFiles, size: totalSize };
}

// 메인 정리 함수
function main() {
  try {
    const startTime = Date.now();
    
    // 현재 디렉토리 체크
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      console.log('❌ package.json을 찾을 수 없습니다.');
      console.log('PPT 맞춤법 검사기 프로젝트 루트 디렉토리에서 실행해주세요.');
      process.exit(1);
    }
    
    let totalFiles = 0;
    let totalSize = 0;
    
    // 각 정리 작업 실행
    const tempResult = cleanTempFiles();
    totalFiles += tempResult.files;
    totalSize += tempResult.size;
    
    console.log('');
    
    const processedResult = cleanProcessedFiles();
    totalFiles += processedResult.files;
    totalSize += processedResult.size;
    
    console.log('');
    
    const logResult = cleanLogFiles();
    totalFiles += logResult.files;
    totalSize += logResult.size;
    
    console.log('');
    
    cleanMetadata();
    
    console.log('');
    
    const systemResult = cleanSystemFiles();
    totalFiles += systemResult.files;
    totalSize += systemResult.size;
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000 * 10) / 10;
    
    console.log('');
    console.log('🎉 정리가 완료되었습니다!');
    console.log('');
    console.log(`📊 요약:`);
    console.log(`   • 삭제된 파일: ${totalFiles}개`);
    console.log(`   • 확보된 공간: ${formatFileSize(totalSize)}`);
    console.log(`   • 소요 시간: ${duration}초`);
    
    if (totalFiles === 0) {
      console.log('');
      console.log('✨ 정리할 파일이 없었습니다. 시스템이 깨끗한 상태입니다.');
    }
    
  } catch (error) {
    console.error('❌ 정리 중 오류가 발생했습니다:', error.message);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}