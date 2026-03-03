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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.7)] p-6 w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-5 rounded-full bg-green-500" />
            <h2 className="text-white font-bold text-base tracking-tight">Google Sheets Configuration</h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-red-400/80 italic mb-6 pl-3.5">*Invite ian.caulin@dict.gov.ph to your sheet if it doesn't work on eFAS</p>

        <div className="space-y-5">
          {/* MDS Regular R10 Settings */}
          <div className="border-l-2 border-blue-500/60 pl-4">
            <h3 className="text-sm font-semibold text-blue-400 mb-3 uppercase tracking-wider">MDS Regular R10 — Main Data</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">Spreadsheet ID</label>
                <input
                  type="text"
                  value={settings.mdsRegR10Id}
                  onChange={(e) => handleChange("mdsRegR10Id", e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
                  placeholder="Enter Google Sheet ID"
                />
                <p className="text-[11px] text-neutral-600 mt-1">Found in the URL: docs.google.com/spreadsheets/d/<span className="font-mono text-neutral-500">YOUR_ID_HERE</span></p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">Sheet Name</label>
                <input
                  type="text"
                  value={settings.mdsRegR10Sheet}
                  onChange={(e) => handleChange("mdsRegR10Sheet", e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
                  placeholder="e.g., MDS Regular R10"
                />
              </div>
            </div>
          </div>

          {/* RAOD Settings */}
          <div className="border-l-2 border-green-500/60 pl-4">
            <h3 className="text-sm font-semibold text-green-400 mb-3 uppercase tracking-wider">RAOD — Obligations Data</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">Spreadsheet ID</label>
                <input
                  type="text"
                  value={settings.raod2024Id}
                  onChange={(e) => handleChange("raod2024Id", e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-colors"
                  placeholder="Enter Google Sheet ID"
                />
                <p className="text-[11px] text-neutral-600 mt-1">Found in the URL: docs.google.com/spreadsheets/d/<span className="font-mono text-neutral-500">YOUR_ID_HERE</span></p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">Sheet Name</label>
                <input
                  type="text"
                  value={settings.raod2024Sheet}
                  onChange={(e) => handleChange("raod2024Sheet", e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-colors"
                  placeholder="e.g., 2025"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {saved && (
          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-xl">
            Settings saved! Copy the URL to share these settings with others.
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-xl text-sm transition-colors"
          >
            Save Settings
          </button>
          <button
            onClick={handleReset}
            className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-medium py-2 px-4 rounded-xl text-sm border border-neutral-700 transition-colors"
          >
            Reset to Default
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white font-medium py-2 px-4 rounded-xl text-sm border border-neutral-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SheetSettingsModal;
