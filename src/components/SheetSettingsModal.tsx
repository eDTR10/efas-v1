import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

interface SheetSettings {
  mdsRegR10Id: string;
  mdsRegR10Sheet: string;
  raod2024Id: string;
  raod2024Sheet: string;
}

interface SheetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_SETTINGS: SheetSettings = {
  mdsRegR10Id: "11pC_pyDKZa797p_HUwt_PCfb7PLJUAtMDsfZ0MPepB4",
  mdsRegR10Sheet: "MDS Regular R10",
  raod2024Id: "1U4P9Up-0xNUlSsIX2DiIAIUZjnliHK8nAKMhQB7wXik",
  raod2024Sheet: "2025",
};

export const getSheetSettings = (): SheetSettings => {
  const params = new URLSearchParams(window.location.search);
  return {
    mdsRegR10Id: params.get("mdsRegR10Id") || DEFAULT_SETTINGS.mdsRegR10Id,
    mdsRegR10Sheet: params.get("mdsRegR10Sheet") || DEFAULT_SETTINGS.mdsRegR10Sheet,
    raod2024Id: params.get("raod2024Id") || DEFAULT_SETTINGS.raod2024Id,
    raod2024Sheet: params.get("raod2024Sheet") || DEFAULT_SETTINGS.raod2024Sheet,
  };
};

export const saveSheetSettings = (settings: SheetSettings) => {
  const params = new URLSearchParams(window.location.search);
  params.set("mdsRegR10Id", settings.mdsRegR10Id);
  params.set("mdsRegR10Sheet", settings.mdsRegR10Sheet);
  params.set("raod2024Id", settings.raod2024Id);
  params.set("raod2024Sheet", settings.raod2024Sheet);
  window.history.replaceState(null, "", `?${params.toString()}`);
};

const SheetSettingsModal: React.FC<SheetSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [settings, setSettings] = useState<SheetSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(getSheetSettings());
  }, [isOpen]);

  const handleChange = (key: keyof SheetSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    saveSheetSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            Google Sheets Configuration
          </h2>

          
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>
        <p className=" text-xs text-red-400 italic">*Invite ian.caulin@dict.gov.ph to your sheet if it doesnt work on efas</p>

        <div className="space-y-6">
          {/* MDS Regular R10 Settings */}
          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">
              MDS Regular R10 (Main Data)
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Spreadsheet ID
                </label>
                <input
                  type="text"
                  value={settings.mdsRegR10Id}
                  onChange={(e) =>
                    handleChange("mdsRegR10Id", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter Google Sheet ID"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Found in the URL: docs.google.com/spreadsheets/d/{" "}
                  <span className="font-mono">YOUR_ID_HERE</span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Sheet Name
                </label>
                <input
                  type="text"
                  value={settings.mdsRegR10Sheet}
                  onChange={(e) =>
                    handleChange("mdsRegR10Sheet", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., MDS Regular R10"
                />
              </div>
            </div>
          </div>

          {/* RAOD 2024 Settings */}
          <div className="border-l-4 border-green-500 pl-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">
              RAOD (Obligations Data)
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Spreadsheet ID
                </label>
                <input
                  type="text"
                  value={settings.raod2024Id}
                  onChange={(e) => handleChange("raod2024Id", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter Google Sheet ID"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Found in the URL: docs.google.com/spreadsheets/d/ YOUR_ID_HERE
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Sheet Name
                </label>
                <input
                  type="text"
                  value={settings.raod2024Sheet}
                  onChange={(e) =>
                    handleChange("raod2024Sheet", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., 2025"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {saved && (
          <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
            Settings saved! Copy the URL to share these settings with others.
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition"
          >
            Save Settings
          </button>
          <button
            onClick={handleReset}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-md transition"
          >
            Reset to Default
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-md transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SheetSettingsModal;
