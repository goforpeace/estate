'use client';

import 'react-quill/dist/quill.snow.css';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';

// Dynamically import ReactQuill to prevent SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
};

export function RichTextEditor({ value, onChange, className, placeholder }: RichTextEditorProps) {
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean']
    ],
  }), []);

  return (
    <div className={cn('bg-background rounded-md border border-input overflow-hidden', className)}>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        placeholder={placeholder}
      />
    </div>
  );
}
