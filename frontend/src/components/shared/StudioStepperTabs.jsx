import React from 'react';

const StudioStepperTabs = ({ steps, activeStep, setStep }) => {
  return (
    <div className="flex justify-center items-center mb-8 pb-6 border-b border-gray-100">
      <div className="flex items-center gap-2">
        {steps.map((step, index) => {
          const isActive = activeStep === step.id;
          const isPassed = steps.findIndex(s => s.id === activeStep) >= index; // active or previous
          const isHighlighted = isPassed;

          return (
            <React.Fragment key={step.id}>
              <div 
                onClick={() => setStep(step.id)}
                className={`flex items-center gap-2 cursor-pointer transition-colors ${isHighlighted ? 'text-[#00b873] font-bold' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white transition-colors ${isHighlighted ? 'bg-[#00b873]' : 'bg-gray-200'}`}>
                  {index + 1}
                </div>
                {step.label}
              </div>
              
              {/* Add connector line except for the last item */}
              {index < steps.length - 1 && (
                <div className={`w-8 h-px transition-colors ${steps.findIndex(s => s.id === activeStep) > index ? 'bg-[#00b873]' : 'bg-gray-200'}`}></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default StudioStepperTabs;
