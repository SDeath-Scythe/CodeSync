import React from 'react';

const CodePreview = ({ code }) => {
        // Simple syntax highlighter simulation for performance in a grid
        return (
                <pre className="font-mono text-[10px] leading-4 text-gray-400 overflow-hidden">
                        {code.split('\n').map((line, i) => (
                                <div key={i} className="flex">
                                        <span className="w-4 text-gray-700 select-none text-right mr-2">{i + 1}</span>
                                        <span dangerouslySetInnerHTML={{
                                                __html: line
                                                        .replace(/(def|function|const|return|if|else|import)/g, '<span class="text-purple-400">$1</span>')
                                                        .replace(/('.*?')/g, '<span class="text-green-400">$1</span>')
                                                        .replace(/(\(|\)|{|})/g, '<span class="text-yellow-500">$1</span>')
                                        }} />
                                </div>
                        ))}
                </pre>
        );
};

export default CodePreview;