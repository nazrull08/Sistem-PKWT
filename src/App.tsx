/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Employee, 
  ContractDocumentData, 
  NotificationLog, 
  UserRole 
} from './types';
import { 
  subscribeEmployees, 
  subscribeContracts, 
  subscribeLogs, 
  subscribeMasterSettings,
  seedInitialDataToFirestore,
  INITIAL_CONTRACTS,
  INITIAL_EMPLOYEES
} from './services/db';
import { testConnection } from './services/firebase';
import { mergeEmployeeToContract } from './utils/mailMerge';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { EmployeeTable } from './components/EmployeeTable';
import { MailMergeView } from './components/MailMergeView';
import { NotificationModal } from './components/NotificationModal';
import { EmployeeModal } from './components/EmployeeModal';
import { ContractGeneratorModal } from './components/ContractGeneratorModal';
import { MasterDataView } from './components/MasterDataView';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'table' | 'contract' | 'master'>('dashboard');
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [contracts, setContracts] = useState<ContractDocumentData[]>(INITIAL_CONTRACTS);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Selected state for Mail Merge
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(INITIAL_EMPLOYEES[0] || null);
  const [activeContract, setActiveContract] = useState<ContractDocumentData>(INITIAL_CONTRACTS[0]);
  const [tableSearchQuery, setTableSearchQuery] = useState('');

  // Modals visibility
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const [isContractGeneratorOpen, setIsContractGeneratorOpen] = useState(false);

  // Test connection & seed initial data on boot
  useEffect(() => {
    testConnection().then(connected => {
      if (connected) {
        console.log('Connected to Firestore successfully.');
      }
    });

    const unsubEmp = subscribeEmployees((list) => {
      setEmployees(list);
      if (list.length > 0 && !selectedEmployee) {
        setSelectedEmployee(list[0]);
      }
    });

    const unsubContracts = subscribeContracts((list) => {
      setContracts(list);
      if (list.length > 0 && !activeContract) {
        setActiveContract(list[0]);
      }
    });

    const unsubLogs = subscribeLogs(setLogs);
    const unsubMaster = subscribeMasterSettings(() => {
      // Master settings (including sequence number) updated in real-time
    });

    return () => {
      unsubEmp();
      unsubContracts();
      unsubLogs();
      unsubMaster();
    };
  }, []);

  // Manual sync trigger
  const handleManualSync = async () => {
    setIsSyncing(true);
    await seedInitialDataToFirestore();
    setTimeout(() => {
      setIsSyncing(false);
    }, 800);
  };

  // Open contract for specific employee
  const handleOpenContractForEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    const merged = mergeEmployeeToContract(emp);
    setActiveContract(merged);
    setActiveTab('contract');
  };

  // Batch mail merge trigger
  const handleBatchMailMerge = (selectedList: Employee[]) => {
    if (selectedList.length > 0) {
      setSelectedEmployee(selectedList[0]);
    }
    setActiveTab('contract');
  };

  // Open notification modal
  const handleOpenNotification = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsNotificationModalOpen(true);
  };

  // Open edit employee modal
  const handleEditEmployee = (emp: Employee) => {
    setEmployeeToEdit(emp);
    setIsEmployeeModalOpen(true);
  };

  // Open add employee modal
  const handleAddEmployee = () => {
    setEmployeeToEdit(null);
    setIsEmployeeModalOpen(true);
  };

  return (
    <div className="min-h-screen md:h-screen w-full bg-slate-100/70 text-slate-900 flex flex-col md:flex-row font-sans selection:bg-blue-500 selection:text-white m-0 p-0 overflow-x-hidden md:overflow-hidden print:h-auto print:overflow-visible print:bg-white">
      {/* Left Navigation Sidebar - Frozen on Left */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        setUserRole={setUserRole}
        isSyncing={isSyncing}
        onSync={handleManualSync}
      />

      {/* Main Content Area - Freeze Panes scroll container with mobile bottom nav safe area */}
      <div className={`flex-1 min-w-0 flex flex-col h-full md:h-screen pb-16 md:pb-0 ${activeTab === 'contract' ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden scroll-smooth'} relative print:h-auto print:overflow-visible print:bg-white print:pb-0`}>
        <main className={`flex-1 w-full ${activeTab === 'contract' ? 'p-1.5 sm:p-2 flex flex-col h-full overflow-hidden' : 'px-2 sm:px-4 py-2 sm:py-4'} print:p-0 print:h-auto print:overflow-visible print:bg-white`}>
          {activeTab === 'dashboard' && (
            <Dashboard
              employees={employees}
              contracts={contracts}
              logs={logs}
              onOpenNotification={handleOpenNotification}
              onOpenContract={handleOpenContractForEmployee}
              onNavigateToTable={(emp) => {
                if (emp) {
                  setSelectedEmployee(emp);
                  setTableSearchQuery(emp.nama);
                } else {
                  setTableSearchQuery('');
                }
                setActiveTab('table');
              }}
            />
          )}

          {activeTab === 'table' && (
            <div className="w-full space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-extrabold text-gray-900">
                    Database Master Kontrak Karyawan (PKWT / PKWTT)
                  </h1>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Tabel data sesuai struktur AKY • Mendukung riwayat kontrak K1 s/d K6 secara fleksibel
                  </p>
                </div>
              </div>

              <EmployeeTable
                employees={employees}
                contracts={contracts}
                onSelectEmployee={setSelectedEmployee}
                onOpenContract={handleOpenContractForEmployee}
                onOpenNotification={handleOpenNotification}
                onEditEmployee={handleEditEmployee}
                onAddEmployee={handleAddEmployee}
                onBatchMailMerge={handleBatchMailMerge}
                userRole={userRole}
                initialSearch={tableSearchQuery}
                onResetSearch={() => setTableSearchQuery('')}
              />
            </div>
          )}

          {activeTab === 'contract' && (
            <MailMergeView
              employees={employees}
              selectedEmployee={selectedEmployee}
              onSelectEmployee={setSelectedEmployee}
              userRole={userRole}
            />
          )}

          {activeTab === 'master' && (
            <MasterDataView
              employees={employees}
              onOpenContract={handleOpenContractForEmployee}
              onRefreshData={() => {}}
            />
          )}
        </main>

        {/* Footer (hidden when in contract preview mode or printing to preserve 100% viewport) */}
        {activeTab !== 'contract' && (
          <footer className="print:hidden border-t border-gray-200 bg-white py-3 text-center text-xs text-gray-500 w-full px-4">
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2">
              <p>
                &copy; {new Date().getFullYear()} PT. ANDHANA KIRANA YASA. Seluruh hak cipta dilindungi undang-undang.
              </p>
              <p className="text-[11px] text-gray-400">
                Sistem Manajemen Kontrak Kerja PKWT / PKWTT • Format Resmi A4 Sesuai PP No. 35/2021
              </p>
            </div>
          </footer>
        )}
      </div>

      {/* Modals */}
      {isNotificationModalOpen && selectedEmployee && (
        <NotificationModal
          isOpen={isNotificationModalOpen}
          onClose={() => setIsNotificationModalOpen(false)}
          employee={selectedEmployee}
          onNotificationSent={() => {}}
        />
      )}

      {isEmployeeModalOpen && (
        <EmployeeModal
          key={employeeToEdit?.id || 'new'}
          isOpen={isEmployeeModalOpen}
          onClose={() => {
            setIsEmployeeModalOpen(false);
            setEmployeeToEdit(null);
          }}
          employee={employeeToEdit}
          onSaved={() => {
            setIsEmployeeModalOpen(false);
            setEmployeeToEdit(null);
          }}
          totalEmployees={employees.length}
        />
      )}

      {isContractGeneratorOpen && selectedEmployee && (
        <ContractGeneratorModal
          isOpen={isContractGeneratorOpen}
          onClose={() => setIsContractGeneratorOpen(false)}
          employee={selectedEmployee}
          onContractCreated={(newContract) => {
            setActiveContract(newContract);
            setActiveTab('contract');
          }}
        />
      )}
    </div>
  );
}
