'use client';
import React, { useState, ChangeEvent } from 'react';

const FileUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a file first.');
      return;
    }

    setUploading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.status === 'success') {
        setMessage(`File uploaded successfully: ${file.name}`);
      } else {
        setMessage('Upload failed.');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setMessage('Upload error occurred.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ width: '400px', margin: '20px auto', textAlign: 'center' }}>
      <h2>Upload a File</h2>
      <input type="file" onChange={handleFileChange} />
      <br />
      <button onClick={handleUpload} disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
      <p>{message}</p>
    </div>
  );
};

export default FileUpload;
