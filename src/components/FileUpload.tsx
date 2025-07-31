import React, { useCallback, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onRemoveFile: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, selectedFile, onRemoveFile }) => {
  const [isDragActive, setIsDragActive] = useState(false);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        onFileSelect(file);
      } else {
        alert('Invalid file type. Please select a PDF file only.');
      }
    }
  }, [onFileSelect]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        onFileSelect(file);
      } else {
        alert('Invalid file type. Please select a PDF file only.');
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (selectedFile) {
    return (
      <div className="bg-[#415a77] rounded-lg p-6 border-2 border-dashed border-[#778da9]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-[#6366F1] p-3 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-[#f9fafb] font-medium">{selectedFile.name}</h3>
              <p className="text-[#cbd5e1] text-sm">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
          <button
            onClick={onRemoveFile}
            className="bg-[#EF4444] hover:bg-red-600 p-2 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-[#415a77] rounded-lg p-8 border-2 border-dashed transition-all cursor-pointer ${
        isDragActive
          ? 'border-[#6366F1] bg-[#6366F1]/10'
          : 'border-[#778da9] hover:border-[#6366F1]'
      }`}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <div className="flex flex-col items-center text-center">
        <div className="bg-[#778da9] p-4 rounded-full mb-4">
          <Upload className="w-8 h-8 text-[#f9fafb]" />
        </div>
        <h3 className="text-[#f9fafb] text-lg font-medium mb-2">
          Drag and drop your PDF certificate
        </h3>
        <p className="text-[#cbd5e1] mb-4">to view its contents</p>
        <div className="text-[#cbd5e1] mb-4">or</div>
        <button className="bg-[#6366F1] hover:bg-indigo-600 text-white px-6 py-3 rounded-lg transition-colors font-medium">
          Select PDF File
        </button>
        <input
          id="file-input"
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default FileUpload;