import { useState } from 'react'
import ProjectsTab from './tabs/ProjectsTab'
import ClassTypeTab from './tabs/ClassTypeTab'
import FundSourceTab from './tabs/FundSourceTab'
import PAPTab from './tabs/PAPTab'
import SaroTaggingTab from './tabs/SaroTaggingTab'
import NtcaTaggingTab from './tabs/NtcaTaggingTab'
import ObjectCodeTab from './tabs/ObjectCodeTab'

type Tab = 'projects' | 'pap' | 'class-type' | 'fund-source' | 'object-code' | 'saro-tagging' | 'ntca-tagging'

const tabs: { id: Tab; label: string }[] = [
    { id: 'projects', label: 'Projects / Programs' },
    { id: 'pap', label: 'PAP' },
    { id: 'class-type', label: 'Class Type' },
    { id: 'fund-source', label: 'Fund Source' },
    { id: 'object-code', label: 'Object Code' },
    { id: 'saro-tagging', label: 'SARO Tagging' },
    { id: 'ntca-tagging', label: 'NTCA Tagging' },
]

export default function EfasSettingsContainer() {
    const [activeTab, setActiveTab] = useState<Tab>('projects')

    return (
        <div className="flex flex-col gap-5">
            <div>
                <h1 className="text-2xl font-gbold text-foreground">Settings</h1>
                <p className="text-muted-foreground text-sm mt-0.5">Manage system configuration and references.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border overflow-x-auto overflow-y-hidden">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2.5 text-sm font-gmedium whitespace-nowrap transition border-b-2 -mb-px ${activeTab === tab.id
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div>
                {activeTab === 'projects' && <ProjectsTab />}
                {activeTab === 'pap' && <PAPTab />}
                {activeTab === 'class-type' && <ClassTypeTab />}
                {activeTab === 'fund-source' && <FundSourceTab />}
                {activeTab === 'object-code' && <ObjectCodeTab />}
                {activeTab === 'saro-tagging' && <SaroTaggingTab />}
                {activeTab === 'ntca-tagging' && <NtcaTaggingTab />}
            </div>
        </div>
    )
}
