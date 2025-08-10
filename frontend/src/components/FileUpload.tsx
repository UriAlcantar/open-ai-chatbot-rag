import React, { useState, useCallback } from 'react';

interface FileUploadProps {
  apiUrl: string;
  onUploadComplete?: (result: any) => void;
}

interface UploadResult {
  success: boolean;
  message: string;
  fileName: string;
  s3Key: string;
  chunksProcessed: number;
  totalChunks: number;
  userId: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ apiUrl, onUploadComplete }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string>('');

  // Generar un ID de usuario simple (en producción usarías autenticación)
  const userId = `user-${Date.now()}`;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    // Validar tipo de archivo
    const allowedTypes = ['text/plain', 'text/markdown', 'application/json', 'text/csv'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
      setError('Solo se permiten archivos de texto (.txt, .md, .json, .csv)');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo es demasiado grande. Máximo 5MB');
      return;
    }

    setSelectedFile(file);
    setError('');
    setUploadResult(null);

    // Leer contenido del archivo
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFileContent(content);
    };
    reader.readAsText(file);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !fileContent) {
      setError('Por favor selecciona un archivo');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      // Simular progreso
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const response = await fetch(`${apiUrl}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: fileContent,
          fileName: selectedFile.name,
          userId: userId
        }),
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al subir el archivo');
      }

      const result: UploadResult = await response.json();
      setUploadResult(result);
      
      if (onUploadComplete) {
        onUploadComplete(result);
      }

      // Limpiar después de 5 segundos
      setTimeout(() => {
        setSelectedFile(null);
        setFileContent('');
        setUploadResult(null);
        setUploadProgress(0);
      }, 5000);

    } catch (error: any) {
      setError(error.message || 'Error al procesar el archivo');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, fileContent, apiUrl, userId, onUploadComplete]);

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setFileContent('');
    setUploadResult(null);
    setError('');
    setUploadProgress(0);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          📄 Subir Documento para RAG
        </h2>
        
        <p className="text-gray-600 mb-6">
          Sube un archivo de texto para crear embeddings y hacerlo disponible para búsquedas semánticas.
        </p>

        {/* Área de Drag & Drop */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {!selectedFile ? (
            <div>
              <div className="text-6xl mb-4">📁</div>
              <p className="text-lg text-gray-600 mb-2">
                Arrastra y suelta tu archivo aquí
              </p>
              <p className="text-sm text-gray-500 mb-4">
                o haz clic para seleccionar
              </p>
              <input
                type="file"
                accept=".txt,.md,.json,.csv,text/*"
                onChange={handleFileInput}
                className="hidden"
                id="file-input"
              />
              <label
                htmlFor="file-input"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors"
              >
                Seleccionar Archivo
              </label>
            </div>
          ) : (
            <div>
              <div className="text-4xl mb-4">✅</div>
              <p className="text-lg font-semibold text-gray-800 mb-2">
                {selectedFile.name}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isUploading ? 'Procesando...' : 'Subir y Procesar'}
                </button>
                <button
                  onClick={handleClear}
                  disabled={isUploading}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  Cambiar Archivo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Barra de Progreso */}
        {isUploading && (
          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Procesando archivo...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">❌ {error}</p>
          </div>
        )}

        {/* Resultado */}
        {uploadResult && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-2">🎉</span>
              <h3 className="text-lg font-semibold text-green-800">
                Archivo procesado exitosamente
              </h3>
            </div>
            <div className="text-sm text-green-700 space-y-1">
              <p><strong>Archivo:</strong> {uploadResult.fileName}</p>
              <p><strong>Chunks procesados:</strong> {uploadResult.chunksProcessed}/{uploadResult.totalChunks}</p>
              <p><strong>Usuario:</strong> {uploadResult.userId}</p>
              <p><strong>Ubicación S3:</strong> {uploadResult.s3Key}</p>
            </div>
            <p className="text-xs text-green-600 mt-2">
              El archivo ahora está disponible para búsquedas semánticas en el chat.
            </p>
          </div>
        )}

        {/* Preview del contenido */}
        {fileContent && !uploadResult && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              📖 Vista previa del contenido
            </h3>
            <div className="bg-gray-50 border rounded-md p-4 max-h-64 overflow-y-auto">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                {fileContent.length > 1000 
                  ? fileContent.substring(0, 1000) + '...' 
                  : fileContent
                }
              </pre>
              {fileContent.length > 1000 && (
                <p className="text-xs text-gray-500 mt-2">
                  Mostrando los primeros 1000 caracteres de {fileContent.length} totales
                </p>
              )}
            </div>
          </div>
        )}

        {/* Información adicional */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            ℹ️ Información del Proceso
          </h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• El archivo se divide en chunks de ~1000 caracteres</li>
            <li>• Cada chunk se convierte en un embedding vectorial</li>
            <li>• Los embeddings se almacenan en OpenSearch</li>
            <li>• El archivo original se guarda en S3</li>
            <li>• Formatos soportados: .txt, .md, .json, .csv</li>
            <li>• Tamaño máximo: 5MB</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
