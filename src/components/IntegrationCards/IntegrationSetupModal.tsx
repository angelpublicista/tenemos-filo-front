"use client";

import React from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'flowbite-react';
import { HiOutlineQuestionMarkCircle } from 'react-icons/hi';

interface Step {
  label: string;
  code?: string;
}

interface IntegrationSetupModalProps {
  show: boolean;
  onClose: () => void;
  title: string;
  icon: React.ReactNode;
  docsUrl: string;
  steps: Step[];
  redirectUri: string;
}

export default function IntegrationSetupModal({
  show,
  onClose,
  title,
  icon,
  docsUrl,
  steps,
  redirectUri,
}: IntegrationSetupModalProps) {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <Modal show={show} onClose={onClose} size="lg">
      <ModalHeader>
        <div className="flex items-center gap-3">
          {icon}
          <span>Cómo configurar {title}</span>
        </div>
      </ModalHeader>
      <ModalBody>
        <div className="space-y-5 text-sm text-gray-700 dark:text-gray-300">
          {/* Pasos */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Pasos de configuración</h4>
            <ol className="space-y-2">
              {steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F26726] text-white text-xs flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  <span>
                    {step.label}
                    {step.code && (
                      <code className="ml-1 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">
                        {step.code}
                      </code>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* Redirect URI */}
          {redirectUri && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="font-semibold text-blue-800 dark:text-blue-200 mb-1">Redirect URI (cópialo exacto)</p>
              <code className="block bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded px-3 py-2 text-xs font-mono text-blue-700 dark:text-blue-300 break-all">
                {appUrl}{redirectUri}
              </code>
            </div>
          )}


          {/* Link a docs */}
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <HiOutlineQuestionMarkCircle className="w-4 h-4 flex-shrink-0" />
            <span>Documentación oficial:</span>
            <a
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#F26726] hover:underline font-medium"
            >
              {docsUrl}
            </a>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={onClose}>Cerrar</Button>
      </ModalFooter>
    </Modal>
  );
}
