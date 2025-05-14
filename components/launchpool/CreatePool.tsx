'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal'; 
import { useTranslation } from 'react-i18next';

const CreatePool = () => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    protocol: '',
    logo: '',
    assetName: '',
    totalSupply: '',
    poolSize: '',
    launchCap: '',
    maxAddresses: '',
    maxParticipation: '',
    rounds: 1,
    startTime: '',
    endTime: '',
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleNextStep = () => setStep((prev) => prev + 1);
  const handlePrevStep = () => setStep((prev) => prev - 1);

  const handleInputChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

    function handleConfirm(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
        event.preventDefault();
        setShowConfirmModal(false);
        console.log('Deployment confirmed with the following details:', formData);
        // Add logic to handle the deployment process, such as API calls or smart contract interactions
        alert('Deployment confirmed!');
    }

  return (
    <div className="p-6 max-w-[1360px] mx-auto rounded-lg shadow-md">
      {/* Fixed Header */}
      <div className="sticky top-0 bg-gray-900/50 border border-zinc-600 z-10 p-4  rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-2">{t('Create LaunchPool')}</h2>
        <p className="text-zinc-400">{t('Create a new launch pool for your asset. Please fill in the details below')}</p>
      </div>

      <hr className="mb-6 h-1" />
      {/* Step Content */}
      <div className="p-6 max-w-[1360px] mx-auto bg-zinc-800/50 border border-zinc-600 rounded-lg shadow-lg">
      {step === 1 && (
        <div className="mt-4">
          <div className="text-lg font-bold h-10">
          <span className="px-4 py-2 border-l-6 border-purple-500">{t('Step 1: Deploy Asset')}</span>
          </div>
          <p className="text-sm text-zinc-400 mt-2">{t('Select the protocol and provide basic details about your asset.')}</p>
          <div className="flex justify-items-start items-center mt-4 gap-4">
            <label className="block text-sm font-medium text-gray-300">{t('Protocol')}</label>
            <Select onValueChange={(value) => handleInputChange('protocol', value)} >
              <SelectTrigger className="w-56 py-4 h-12">{formData.protocol || t('Select Protocol')}</SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                <SelectItem value="ORDX" className="h-9 py-2">ORDX</SelectItem>
                <SelectItem value="Runes" className="h-9 py-2">Runes</SelectItem>
                <SelectItem value="BRC20" className="h-9 py-2">BRC20</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="block text-sm font-medium text-gray-300 mt-4 mb-1">{t('Asset Logo URL')}</label>
          <Input
            placeholder={t('Asset Logo URL')}
            onChange={(e) => handleInputChange('logo', e.target.value)}
          />
          <label className="block text-sm font-medium text-gray-300 mt-4 mb-1">{t('Asset Name (Symbol)')}</label>
          <Input
            placeholder={t('Asset Name (Symbol)')}
            onChange={(e) => handleInputChange('assetName', e.target.value)}
          />
          <label className="block text-sm font-medium text-gray-300 mt-4 mb-1">{t('Total Supply')}</label>
          <Input
            placeholder={t('Total Supply')}
            type="number"
            onChange={(e) => handleInputChange('totalSupply', e.target.value)}
          />
          <Button onClick={() => setShowConfirmModal(true)} className="px-6 mt-4 btn-gradient">{t('Deploy')}</Button>
        </div>
      )}

      {step === 2 && (
        <div className="mt-4">
          <div className="text-base font-bold h-10">
            <span className="px-4 py-2 border-l-6 border-purple-500">{t('Step 2: Configure Smart Contract')}</span>
          </div>
          <p className="text-sm text-zinc-400 mt-2">{t('Set up the smart contract parameters for your launch pool.')}</p>
          <label className="block text-sm font-medium mt-4 text-gray-300 mb-1">{t('Pool Size')}</label>
          <Input
            placeholder={t('Pool Size')}
            type="number"
            onChange={(e) => handleInputChange('poolSize', e.target.value)}
          />
          <label className="block text-sm font-medium text-gray-300 mt-4 mb-1">{t('Launch Cap')}</label>
          <Input
            placeholder={t('Launch Cap')}
            type="number"
            onChange={(e) => handleInputChange('launchCap', e.target.value)}
          />
          <label className="block text-sm font-medium text-gray-300 mt-4 mb-1">{t('Max Addresses')}</label>
          <Input
            placeholder={t('Max Addresses')}
            type="number"
            onChange={(e) => handleInputChange('maxAddresses', e.target.value)}
          />
          <label className="block text-sm font-medium text-gray-300 mt-4 mb-1">{t('Max Participation per Address')}</label>
          <Input
            placeholder={t('Max Participation per Address')}
            type="number"
            onChange={(e) => handleInputChange('maxParticipation', e.target.value)}
          />
          <label className="block text-sm font-medium text-gray-300 mt-4 mb-1">{t('Start Time')}</label>
          <Input
            placeholder={t('Start Time')}
            type="datetime-local"
            onChange={(e) => handleInputChange('startTime', e.target.value)}
          />
          <label className="block text-sm font-medium text-gray-300 mt-4 mb-1">{t('End Time')}</label>
          <Input
            placeholder={t('End Time')}
            type="datetime-local"
            onChange={(e) => handleInputChange('endTime', e.target.value)}
          />
          <Button onClick={handleNextStep} className="btn-gradient mt-4">{t('Submit Template')}</Button>
        </div>
      )}

      {step === 3 && (
        <div className="mt-4">
          <div className="text-base font-bold h-10">
          <span className="px-4 py-2 border-l-6 border-purple-500">{t('Step 3: Monitor Pool')}</span>
          </div>
          <p className="text-sm text-zinc-400 mt-2">{t('Monitor the progress of your launch pool and user participation.')}</p>
          <p className="mt-4">{t('Waiting for user participation and pool completion...')}</p>
          {/* Add monitoring logic here */}
        </div>
      )}

      <div className="mt-4 py-4 flex justify-between">
        {step > 1 && <Button className="w-40 sm:w-48" variant="outline" onClick={handlePrevStep}>{t('Previous')}</Button>}
        {step < 3 && <Button className="w-40 sm:w-48" variant="outline" onClick={handleNextStep}>{t('Next')}</Button>}
      </div>

      {showConfirmModal && (
        <Modal onClose={() => setShowConfirmModal(false)}>
          <div>
            <h3>{t('Confirm Deployment')}</h3>
            <p>{t('Asset Name')}: {formData.assetName}</p>
            <p>{t('Protocol')}: {formData.protocol}</p>
            <p>{t('Total Supply')}: {formData.totalSupply}</p>
            <Button onClick={handleConfirm}>{t('Confirm')}</Button>
          </div>
        </Modal>
      )}
    </div>
    </div>
  );
};

export default CreatePool;
