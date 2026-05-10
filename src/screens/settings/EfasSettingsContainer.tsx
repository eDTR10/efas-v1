import { useState } from 'react'
import PAPTab from './tabs/PAPTab'
import ObjectDescriptionTab from './tabs/ObjectDescriptionTab'
import FundTypeTab from './tabs/FundTypeTab'
import ClassTypeTab from './tabs/ClassTypeTab'

type Tab = 'pap' | 'object_description' | 'fund_type' | 'class_type'

const TABS: { id: Tab; label: string }[] = [
    { id: 'pap', label: 'PAP' },
    { id: 'object_description', label: 'Object Description' },
    { id: 'fund_type', label: 'Fund Type' },
    { id: 'class_type', label: 'Class Type' },
]

export default function EfasSettingsContainer() {
    const [activeTab, setActiveTab] = useState<Tab>('pap')

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-gbold text-foreground">Settings</h1>
                <p className="text-muted-foreground text-sm mt-0.5">Manage reference data for eFAS.</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-border">
                <div className="flex gap-1">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2.5 text-sm font-gmedium rounded-t-lg transition -mb-px border border-b-0 ${activeTab === tab.id
                                ? 'bg-background border-border text-foreground'
                                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab content */}
            <div>
                {activeTab === 'pap' && <PAPTab />}
                {activeTab === 'object_description' && <ObjectDescriptionTab />}
                {activeTab === 'fund_type' && <FundTypeTab />}
                {activeTab === 'class_type' && <ClassTypeTab />}
            </div>
        </div>
    )
}
