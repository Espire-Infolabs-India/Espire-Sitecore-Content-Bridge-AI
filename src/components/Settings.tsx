"use client";
import { useState } from "react";

interface SettingsProps {
  prompt: string;
  brandWebsite: string;
  setPromptValue: (value: React.SyntheticEvent) => void;
  setBrandWebsite: (value: React.SyntheticEvent) => void;
}

const Settings: React.FC<SettingsProps> = ({prompt, brandWebsite, setPromptValue, setBrandWebsite }) => {
  const [isModalOpen, setModalOpen] = useState(false);
  return (
    <div>
      <div className="flex justify-end gap-2">
        <button
          className="primary-button"
          onClick={() => setModalOpen(true)}
        >
          Settings
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center modal-body active">
          <div className="bg-white p-6 rounded-lg w-[500px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-black">Settings</h2>
              <button onClick={() => setModalOpen(false)}>X</button>
            </div>

            <div className="mb-4 flex flex-col gap-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-black">Prompt</label>
                <textarea className="w-full h-20" placeholder="Enter a prompt" value={prompt} onChange={setPromptValue}></textarea>
              </div>

              <div className="flex flex-col gap-2">
                 <label className="text-sm font-bold text-black">Brand Website</label>
                 <textarea className="w-full h-20" placeholder="Enter a Brand Website" value={brandWebsite} onChange={setBrandWebsite}></textarea>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="primary-button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
