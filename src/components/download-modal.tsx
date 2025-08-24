"use client";

import { useState } from "react";
import { Download, CheckCircle, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  downloadFileId: string;
  originalFileName: string;
  appliedCorrections: number;
}

export default function DownloadModal({
  isOpen,
  onClose,
  downloadFileId,
  originalFileName,
  appliedCorrections
}: DownloadModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!downloadFileId) return;
    
    setIsDownloading(true);
    try {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        alert("인증이 필요합니다.");
        return;
      }

      // Create download link
      const downloadUrl = `/api/download/${encodeURIComponent(downloadFileId)}`;
      const downloadLink = document.createElement('a');
      downloadLink.href = `${downloadUrl}?token=${encodeURIComponent(authToken)}`;
      downloadLink.download = `corrected_${originalFileName}`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      console.log(`파일 다운로드 시작: ${originalFileName}`);
      
    } catch (error) {
      console.error('다운로드 오류:', error);
      alert('파일 다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleNewCorrection = () => {
    onClose();
    // 페이지 새로고침하여 새로운 파일을 선택할 수 있도록 함
    window.location.reload();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6">
          {/* Success icon */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full blur-xl opacity-40 animate-pulse" />
              <div className="relative bg-gradient-to-br from-green-500 to-emerald-500 rounded-full p-4 shadow-lg">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>

          {/* Title and description */}
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-green-600 mb-2">
              교정 완료! 🎉
            </h3>
            <p className="text-gray-600">
              {appliedCorrections}개 교정사항이 적용되었습니다.
            </p>
            {originalFileName && (
              <p className="text-xs text-gray-500 mt-2">
                📄 {originalFileName}
              </p>
            )}
          </div>

          {/* Download button */}
          <div className="space-y-3">
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {isDownloading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  다운로드 중...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  교정된 파일 다운로드
                </>
              )}
            </Button>

            {/* New correction button */}
            <Button
              onClick={handleNewCorrection}
              variant="outline"
              className="w-full border-amber-200 hover:bg-amber-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              다른 파일 교정하기
            </Button>
          </div>

          {/* Info */}
          <div className="mt-4 text-xs text-gray-500 text-center">
            <p>• 원본 파일은 그대로 유지됩니다</p>
            <p>• 교정된 내용만 새 파일에 적용됩니다</p>
          </div>
        </div>
      </div>
    </div>
  );
}