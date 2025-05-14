'use client';

import { Button } from '@/components/ui/button';

const TemplateDetailsClient = ({
  templateId,
  closeModal,
}: {
  templateId: string;
  closeModal: () => void;
}) => {
  // Simulated template data
  const templates = {
    Template001: {
      name: 'Template 001',
      description: 'This template is used for creating small launch pools.',
      parameters: [
        { key: 'Pool Size', value: '50,000,000' },
        { key: 'Launch Cap', value: '30,000,000' },
        { key: 'Max Addresses', value: '300' },
        { key: 'Max Participation per Address', value: '5,000' },
        { key: 'Start Time', value: '2025-05-01 12:00' },
        { key: 'End Time', value: '2025-05-10 12:00' },
      ],
    },
    Template002: {
      name: 'Template 002',
      description: 'This template is used for creating medium-sized launch pools.',
      parameters: [
        { key: 'Pool Size', value: '80,000,000' },
        { key: 'Launch Cap', value: '48,000,000' },
        { key: 'Max Addresses', value: '500' },
        { key: 'Max Participation per Address', value: '10,000' },
        { key: 'Start Time', value: '2025-05-01 12:00' },
        { key: 'End Time', value: '2025-05-15 12:00' },
      ],
    },
    Template003: {
      name: 'Template 003',
      description: 'This template is used for creating large launch pools.',
      parameters: [
        { key: 'Pool Size', value: '100,000,000' },
        { key: 'Launch Cap', value: '60,000,000' },
        { key: 'Max Addresses', value: '1,000' },
        { key: 'Max Participation per Address', value: '20,000' },
        { key: 'Start Time', value: '2025-05-01 12:00' },
        { key: 'End Time', value: '2025-05-20 12:00' },
      ],
    },
  };

  const templateDetails = templates[templateId] || templates.Template001; // Default to Template001

  return (
    <div className="p-6 mt-6 w-full sm:w-[1360px] mx-auto bg-accent/50 rounded-lg shadow-md">
      <div className="relative flex justify-between items-center mb-4">
        <span>
          <h2 className="text-xl font-bold mb-4">{templateDetails.name}</h2>
          <p className="text-zinc-400 mb-6">{templateDetails.description}</p>
        </span>
        <button
          className="absolute top-0 right-0 text-zinc-400 hover:text-white"
          onClick={closeModal} // 调用 closeModal
        >
          ✕
        </button>
      </div>

      <table className="w-full border-collapse border border-zinc-700 rounded-lg shadow-md">
        <thead className="p-2 bg-zinc-700 text-white">
          <tr>
            <th className="p-4 text-left w-1/3">Parameter</th>
            <th className="p-2 text-left">Value</th>
          </tr>
        </thead>
        <tbody>
          {templateDetails.parameters.map((param, index) => (
            <tr key={index} className="border-b border-gray-700">
              <td className="p-4">{param.key}</td>
              <td className="p-2">{param.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button variant="outline" className="mt-6 w-full sm:w-48 h-11" onClick={closeModal}>
        Close
      </Button>
    </div>
  );
};

export default TemplateDetailsClient;
