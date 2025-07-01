import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Download, Eye, EyeOff, RefreshCw, Upload, Settings, Database, FileText, AlertTriangle, CheckCircle, Info } from 'lucide-react';

// Constants
const API_ENDPOINTS = {
  GEMINI: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'
};

const SUPPORTED_FORMATS = ['JSON', 'CSV', 'TSV', 'Pipe-separated', 'Semicolon-separated'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ROWS_DISPLAY = 1000;

// Utility functions
const sanitizeInput = (input) => {
  return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};

const validateApiKey = (key) => {
  return key && key.trim().length > 20 && key.startsWith('AIza');
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Custom hooks
const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
};

// Components
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertTriangle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />
  };

  const styles = {
    success: 'bg-green-500/20 border-green-500/30 text-green-300',
    error: 'bg-red-500/20 border-red-500/30 text-red-300',
    info: 'bg-blue-500/20 border-blue-500/30 text-blue-300'
  };

  return (
    <div className={`fixed top-4 right-4 max-w-md p-4 rounded-xl border backdrop-blur-lg z-50 ${styles[type]} animate-slide-in`}>
      <div className="flex items-center gap-3">
        {icons[type]}
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="ml-auto text-lg hover:opacity-70">×</button>
      </div>
    </div>
  );
};

const FileUpload = ({ onFileLoad }) => {
  const fileInputRef = useRef(null);

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert(`File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(MAX_FILE_SIZE)})`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        onFileLoad(content, file.name);
      } catch (error) {
        console.error('File reading error:', error);
        alert('Error reading file. Please try again.');
      }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  }, [onFileLoad]);

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.csv,.txt,.tsv"
        onChange={handleFileUpload}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 transform hover:scale-105 shadow-lg"
      >
        <Upload className="w-5 h-5" />
        Upload File
      </button>
      <p className="text-xs text-gray-400 text-center">
        Supports JSON, CSV, TSV files up to {formatFileSize(MAX_FILE_SIZE)}
      </p>
    </div>
  );
};

const ApiKeyManager = ({ apiKey, setApiKey, isValid }) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!isValid);

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Settings className="w-5 h-5" />
          API Configuration
        </h2>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs ${
            isValid ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
          }`}>
            {isValid ? '✅ Ready' : '⚠️ Setup Required'}
          </span>
          <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </div>
      
      {isExpanded && (
        <div className="mt-4 space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Gemini API Key
              </label>
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Gemini API key (AIza...)"
                className="w-full bg-black/20 border border-white/20 rounded-xl p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="mt-7 bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-xl transition-colors"
              title={showApiKey ? "Hide API Key" : "Show API Key"}
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-blue-200 text-xs">
              <strong>Get your free API key:</strong>{' '}
              <a 
                href="https://makersuite.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Google AI Studio
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const DataTable = ({ data, columns, onExport }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');

  const sortedData = useMemo(() => {
    if (!sortColumn) return data;
    
    return [...data].sort((a, b) => {
      const aVal = (a[sortColumn] || '').toString().toLowerCase();
      const bVal = (b[sortColumn] || '').toString().toLowerCase();
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortColumn, sortDirection]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedData, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(sortedData.length / rowsPerPage);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
      <div className="p-6 border-b border-white/20">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Database className="w-5 h-5" />
              Data Table
            </h2>
            <p className="text-gray-300 text-sm mt-1">
              {sortedData.length} rows • {columns.length} columns
              {sortedData.length > MAX_ROWS_DISPLAY && (
                <span className="text-yellow-300 ml-2">
                  (Showing first {MAX_ROWS_DISPLAY} rows)
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-black/20 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
              <option value={500}>500 rows</option>
            </select>
            
            <button
              onClick={onExport}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>
      
      <div className="overflow-auto max-h-96">
        <table className="w-full">
          <thead className="sticky top-0 bg-black/60 backdrop-blur-sm">
            <tr>
              {columns.map((column, i) => (
                <th 
                  key={i} 
                  className="px-6 py-4 text-left text-sm font-semibold text-blue-300 border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center gap-2">
                    {column}
                    {sortColumn === column && (
                      <span className="text-xs">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, i) => (
              <tr key={i} className="hover:bg-white/5 transition-colors border-b border-white/5">
                {columns.map((column, j) => (
                  <td key={j} className="px-6 py-4 text-sm text-gray-200">
                    <div className="max-w-xs truncate" title={(row[column] || '').toString()}>
                      {(row[column] || '').toString()}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className="p-4 border-t border-white/20 flex items-center justify-between">
          <div className="text-sm text-gray-300">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Component
const ProductionDataViewer = () => {
  const [inputData, setInputData] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState('');
  const [dataType, setDataType] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKey, setApiKey] = useLocalStorage('gemini_api_key', '');
  const [toast, setToast] = useState(null);
  const [fileName, setFileName] = useState('');

  const isApiKeyValid = validateApiKey(apiKey);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
  }, []);

  const correctDataWithGemini = useCallback(async (data) => {
    if (!isApiKeyValid) {
      throw new Error('Please enter a valid Gemini API key first');
    }

    const prompt = `You are a data format expert. Fix this malformed data to make it valid JSON or CSV format.

Rules:
1. If it looks like JSON, return valid JSON
2. If it looks like CSV/tabular, return proper CSV format
3. Add missing quotes, brackets, commas as needed
4. Fix common syntax errors
5. Preserve the original data structure and values
6. Return ONLY the corrected data, no explanations

Data to fix:
${data}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(`${API_ENDPOINTS.GEMINI}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 0.8,
            maxOutputTokens: 8192,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH", 
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.candidates || result.candidates.length === 0) {
        throw new Error('No response from Gemini API');
      }

      const correctedData = result.candidates[0].content.parts[0].text.trim();
      
      return correctedData
        .replace(/^```[\w]*\n?/, '')
        .replace(/\n?```$/, '')
        .trim();

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      console.error('Gemini API Error:', error);
      throw new Error(`AI correction failed: ${error.message}`);
    }
  }, [apiKey, isApiKeyValid]);

  const parseData = useCallback((data) => {
    if (!data || !data.trim()) return null;

    const sanitizedData = sanitizeInput(data.trim());

    // Try JSON first
    try {
      const jsonData = JSON.parse(sanitizedData);
      const arrayData = Array.isArray(jsonData) ? jsonData : [jsonData];
      return { data: arrayData.slice(0, MAX_ROWS_DISPLAY), type: 'JSON' };
    } catch (e) {}

    // Try delimited formats
    const lines = sanitizedData.split('\n').filter(line => line.trim());
    if (lines.length > 1) {
      const delimiters = [',', '\t', '|', ';'];
      let bestDelimiter = ',';
      let maxCount = 0;
      
      delimiters.forEach(delimiter => {
        const count = (lines[0].match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
        if (count > maxCount) {
          maxCount = count;
          bestDelimiter = delimiter;
        }
      });
      
      if (maxCount > 0) {
        const headers = lines[0].split(bestDelimiter)
          .map(h => h.trim().replace(/^["']|["']$/g, ''))
          .filter(h => h);
        
        if (headers.length > 1) {
          const rows = lines.slice(1, MAX_ROWS_DISPLAY + 1).map(line => {
            const values = line.split(bestDelimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = values[index] || '';
            });
            return obj;
          });
          
          if (rows.length > 0) {
            const typeMap = { 
              ',': 'CSV', 
              '\t': 'TSV', 
              '|': 'Pipe-separated', 
              ';': 'Semicolon-separated' 
            };
            return { data: rows, type: typeMap[bestDelimiter] };
          }
        }
      }
    }

    throw new Error('Unrecognized format. Please use JSON, CSV, TSV, or other delimited data.');
  }, []);

  const handleDataChange = useCallback((value) => {
    setInputData(value);
    setError('');
    setFileName('');
    
    if (!value.trim()) {
      setParsedData(null);
      setDataType('');
      return;
    }

    try {
      const result = parseData(value);
      if (result) {
        setParsedData(result.data);
        setDataType(result.type);
        showToast(`Successfully parsed ${result.data.length} rows as ${result.type}`, 'success');
      }
    } catch (err) {
      setError(err.message);
      setParsedData(null);
      setDataType('');
    }
  }, [parseData, showToast]);

  const handleAICorrection = useCallback(async () => {
    if (!inputData.trim()) return;
    
    setIsProcessing(true);
    try {
      const corrected = await correctDataWithGemini(inputData);
      setInputData(corrected);
      
      const result = parseData(corrected);
      if (result) {
        setParsedData(result.data);
        setDataType(result.type);
        setError('');
        showToast('AI successfully corrected your data!', 'success');
      }
    } catch (err) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [inputData, correctDataWithGemini, parseData, showToast]);

  const handleFileLoad = useCallback((content, filename) => {
    setFileName(filename);
    handleDataChange(content);
    showToast(`File "${filename}" loaded successfully`, 'success');
  }, [handleDataChange, showToast]);

  const columns = useMemo(() => {
    if (!parsedData?.length) return [];
    const allKeys = new Set();
    parsedData.forEach(item => Object.keys(item).forEach(key => allKeys.add(key)));
    return Array.from(allKeys);
  }, [parsedData]);

  const exportCSV = useCallback(() => {
    if (!parsedData?.length) return;
    
    try {
      const csv = [
        columns.join(','),
        ...parsedData.map(row => 
          columns.map(col => {
            const value = (row[col] || '').toString().replace(/"/g, '""');
            return `"${value}"`;
          }).join(',')
        )
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName ? fileName.replace(/\.[^/.]+$/, '') : 'data_export'}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast('CSV exported successfully!', 'success');
    } catch (error) {
      showToast('Export failed. Please try again.', 'error');
    }
  }, [parsedData, columns, fileName, showToast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <style jsx>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
      
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            🤖 AI Data Table Viewer
          </h1>
          <p className="text-gray-300 text-lg">
            Production-ready data parsing powered by Google Gemini AI
          </p>
        </div>

        {/* API Configuration */}
        <ApiKeyManager 
          apiKey={apiKey}
          setApiKey={setApiKey}
          isValid={isApiKeyValid}
        />

        {/* Input Section */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Input Data {fileName && <span className="text-sm text-gray-400">({fileName})</span>}
              </h2>
              {dataType && (
                <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm">
                  ✅ {dataType} detected
                </span>
              )}
            </div>
            
            <textarea
              value={inputData}
              onChange={(e) => handleDataChange(e.target.value)}
              placeholder="Paste your data here or upload a file...&#10;&#10;Supported formats: JSON, CSV, TSV, Pipe-separated&#10;&#10;Example JSON: [{&quot;name&quot;: &quot;John&quot;, &quot;age&quot;: 30}]&#10;Example CSV:&#10;name,age,city&#10;John,30,New York"
              className="w-full h-64 bg-black/20 border border-white/20 rounded-xl p-4 text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </div>

          <div className="space-y-6">
            <FileUpload onFileLoad={handleFileLoad} />
            
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-red-400 w-5 h-5 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-red-300 font-medium">Parse Error</h3>
                    <p className="text-red-200 text-sm mt-1">{error}</p>
                    
                    {inputData.trim() && (
                      <div className="mt-4">
                        <p className="text-blue-200 text-sm mb-3">
                          Let AI fix the formatting:
                        </p>
                        <button
                          onClick={handleAICorrection}
                          disabled={isProcessing || !isApiKeyValid}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-all"
                        >
                          {isProcessing ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              ✨ Fix with AI
                            </>
                          )}
                        </button>
                        
                        {!isApiKeyValid && (
                          <p className="text-xs text-yellow-300 mt-2">
                            Configure API key above to use AI correction
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Data Table */}
        {parsedData?.length > 0 && (
          <DataTable 
            data={parsedData}
            columns={columns}
            onExport={exportCSV}
          />
        )}

        {/* Footer */}
        <div className="text-center text-gray-400 text-sm">
          <p>Built with React • Secured with input sanitization • Powered by Gemini AI</p>
        </div>
      </div>
    </div>
  );
};

export default ProductionDataViewer;