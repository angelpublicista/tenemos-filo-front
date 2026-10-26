"use client";

import ReactMarkdown from 'react-markdown';

/**
 * El cuerpo de un artículo. react-markdown no interpreta HTML crudo, así que lo
 * que escriba el administrador no puede meter scripts en el panel.
 */
export default function ContenidoMarkdown({ texto }: { texto: string }) {
  return (
    <div className="text-gray-700 dark:text-gray-300 leading-relaxed [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:font-semibold [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-marca [&_a]:underline [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 dark:[&_code]:bg-gray-700 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:text-gray-500">
      <ReactMarkdown
        components={{
          // Los enlaces externos se abren aparte para no sacar a nadie del panel.
          a: ({ href, children }) => {
            const externo = /^https?:\/\//.test(href ?? '');
            return (
              <a href={href} {...(externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                {children}
              </a>
            );
          },
        }}
      >
        {texto}
      </ReactMarkdown>
    </div>
  );
}
