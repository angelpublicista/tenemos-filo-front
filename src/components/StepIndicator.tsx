"use client";

import React from 'react';
import { HiCheck } from 'react-icons/hi';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
}

export default function StepIndicator({ currentStep, totalSteps, steps }: StepIndicatorProps) {
  return (
    <div className="mb-8">
      {/* Indicador de pasos */}
      <div className="flex items-center justify-center mb-6">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isUpcoming = stepNumber > currentStep;

          return (
            <div key={index} className="flex items-center">
              {/* Círculo del paso */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    isCompleted
                      ? 'bg-[#F26726] text-white shadow-lg'
                      : isCurrent
                      ? 'bg-[#F26726] text-white border-4 border-[#F26726]/20 shadow-lg'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? (
                    <HiCheck className="w-6 h-6" />
                  ) : (
                    stepNumber
                  )}
                </div>
                
                {/* Label del paso */}
                <div className="mt-3 text-center">
                  <div
                    className={`text-sm font-medium transition-colors ${
                      isCompleted || isCurrent
                        ? 'text-[#334C5D]'
                        : 'text-gray-400'
                    }`}
                  >
                    {step}
                  </div>
                </div>
              </div>

              {/* Línea conectora */}
              {index < steps.length - 1 && (
                <div
                  className={`w-16 h-1 mx-4 transition-colors ${
                    isCompleted ? 'bg-[#F26726]' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
