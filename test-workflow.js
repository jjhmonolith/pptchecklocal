#!/usr/bin/env node

// 테스트 스크립트: 파일 업로드 및 분석 워크플로우 테스트

const path = require('path');
const fs = require('fs');

console.log('📋 워크플로우 테스트 시작...');

// 1. file-metadata.json 확인
const metadataPath = path.join(__dirname, 'file-metadata.json');
console.log('\n1. 파일 메타데이터 확인');
if (fs.existsSync(metadataPath)) {
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  const fileIds = Object.keys(metadata);
  console.log(`✅ 저장된 파일: ${fileIds.length}개`);
  
  if (fileIds.length > 0) {
    const latestFileId = fileIds[fileIds.length - 1];
    const latestFile = metadata[latestFileId];
    console.log(`📄 최신 파일: ${latestFile.filename}`);
    console.log(`🆔 파일 ID: ${latestFileId}`);
    console.log(`📍 파일 경로: ${latestFile.filePath}`);
    console.log(`📊 파일 크기: ${Math.round(latestFile.size / 1024 / 1024 * 100) / 100}MB`);
    
    // 파일 실제 존재 확인
    if (fs.existsSync(latestFile.filePath)) {
      console.log('✅ 파일이 실제로 존재함');
      
      // 간단한 분석 API 테스트 (로컬 호스트에 POST 요청)
      console.log('\n2. 분석 API 테스트');
      testAnalysisAPI(latestFileId, latestFile.filename);
    } else {
      console.log('❌ 파일이 존재하지 않음');
    }
  }
} else {
  console.log('❌ 메타데이터 파일이 없습니다. 파일을 먼저 업로드하세요.');
}

async function testAnalysisAPI(fileId, fileName) {
  try {
    const requestBody = {
      fileId: fileId,
      fileName: fileName
    };
    
    console.log('📤 분석 요청 데이터:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch('http://localhost:3333/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token', // 임시 토큰
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log(`📥 응답 상태: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ 분석 성공');
      console.log('📊 결과:', {
        success: result.success,
        jobId: result.jobId,
        suggestionsCount: result.suggestions?.length || 0,
        stats: result.stats
      });
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log('❌ 분석 실패');
      console.log('🚨 오류:', errorData.error || '알 수 없는 오류');
    }
  } catch (error) {
    console.error('🚨 테스트 오류:', error.message);
  }
}

console.log('\n💡 브라우저에서 http://localhost:3333 접속하여 파일을 업로드한 후 이 스크립트를 다시 실행하세요.');