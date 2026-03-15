<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useHead } from '@vueuse/head'
import { useI18n } from 'vue-i18n'
import ThemeLangSwitch from '../components/ui/ThemeLangSwitch.vue'
import SuccessModal from '../components/ui/SuccessModal.vue'
import FaqAccordion from '../components/ui/FaqAccordion.vue'

const { t, locale } = useI18n()
const router = useRouter()

const modalState = ref({
  show: false,
  title: '',
  message: '',
  type: 'success' as 'success' | 'error' | 'warning',
  isConfirm: false,
  onConfirm: () => {}
})

const openModal = (
  title: string, 
  message: string, 
  type: 'success' | 'error' | 'warning' = 'success', 
  isConfirm = false, 
  onConfirm = () => {}
) => {
  modalState.value = { show: true, title, message, type, isConfirm, onConfirm }
}

const closeModal = () => {
  modalState.value.show = false
}

const handleModalConfirm = () => {
  if (modalState.value.isConfirm) {
    modalState.value.onConfirm()
  }
  closeModal()
}

const userData = ref({
  displayName: '-', 
  accountTier: '-', 
  profilePicUrl: '', 
  referralId: '',
  hasPassphrase: false,
  email: '',
  isCoachAccount: false,
  createdAt: ''
})

const fetchUserData = async () => {
  try {
    const response = await fetch('/api/user/profile', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    if (response.ok) {
      const data = await response.json()
      userData.value = {
        displayName: data.displayName || '-', 
        accountTier: data.accountTier || '-', 
        profilePicUrl: data.profilePicUrl || '',
        referralId: data.referralId || '',   
        hasPassphrase: data.hasPassphrase || false,
        email: data.email || '',
        isCoachAccount: data.isCoachAccount || false,
        createdAt: data.createdAt || data.registeredAt || ''
      }
      if (data.region) {
        passphraseForm.value.country = data.region
        withdrawalForm.value.country = data.region
      }
    }
  } catch (error) {
    console.error('Failed to fetch user data:', error)
  }
}

const fileInput = ref<HTMLInputElement | null>(null)
const triggerUpload = () => fileInput.value?.click()

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await fetch('/api/user/avatar', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: formData
    })
    
    if (response.ok) {
      const data = await response.json()
      userData.value.profilePicUrl = data.url
      openModal(t('dashboard.modal.success', 'Success'), t('dashboard.overview.avatar_success', 'Profile picture updated!'), 'success')
    } else {
      openModal(t('dashboard.modal.error', 'Error'), t('dashboard.overview.upload_fail', 'Failed to upload image.'), 'error')
    }
  } catch (error) {
    openModal(t('dashboard.modal.error', 'Error'), t('dashboard.overview.upload_fail', 'Failed to upload image.'), 'error')
  }
}

const welcomeBonusTimestamp = computed(() => {
  if (!userData.value.createdAt) return t('dashboard.overview.loading', 'Loading...');
  
  const d = new Date(userData.value.createdAt);
  
  if (isNaN(d.getTime())) return userData.value.createdAt; 
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
})

const handleLogout = () => {
  openModal(
    t('dashboard.nav.logout', 'Logout'), 
    t('dashboard.nav.logout_confirm', 'Are you sure you want to log out of your account?'), 
    'warning', 
    true, 
    () => {
      localStorage.removeItem('token')
      router.push('/')
    }
  )
}

const securityForm = ref({ oldPassword: '', newPassword: '', confirmNewPassword: '' })
const showPasswords = ref(false) 
const showPassphrase = ref(false)

const newPasswordError = computed(() => {
  const pass = securityForm.value.newPassword
  if (!pass) return ''
  if (pass.length < 6) return t('auth.form.errors.pass_length', 'Password must be at least 6 characters.')
  if (!/[a-z]/.test(pass) || !/[A-Z]/.test(pass) || !/\d/.test(pass)) {
    return t('auth.form.errors.pass_complex', 'Password must contain at least one uppercase letter, one lowercase letter, and one number.')
  }
  return ''
})

const confirmNewPasswordError = computed(() => {
  const confirmPass = securityForm.value.confirmNewPassword
  if (!confirmPass) return ''
  return confirmPass === securityForm.value.newPassword ? '' : t('auth.form.errors.pass_match', 'Passwords do not match.')
})

const savePassword = async () => {
  if (newPasswordError.value || confirmNewPasswordError.value) return

  try {
    const response = await fetch('/api/user/password', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}` 
      },
      body: JSON.stringify({
        oldPassword: securityForm.value.oldPassword,
        newPassword: securityForm.value.newPassword
      })
    })

    if (response.ok) {
      openModal(t('dashboard.modal.success', 'Success'), t('dashboard.overview.pass_update_success', 'Password successfully updated!'), 'success')
      securityForm.value = { oldPassword: '', newPassword: '', confirmNewPassword: '' }
    } else {
      const err = await response.json().catch(() => ({}))
      const errorMsg = err.msg?.toLowerCase() || ''
      
      if (errorMsg.includes('password') || errorMsg.includes('incorrect')) {
        openModal(t('dashboard.modal.error', 'Error'), t('dashboard.overview.pass_incorrect', 'Incorrect current password.'), 'error')
      } else {
        openModal(t('dashboard.modal.error', 'Error'), err.msg || t('dashboard.overview.pass_update_fail', 'Failed to update password.'), 'error')
      }
    }
  } catch (error) {
    console.error(error)
    openModal(t('dashboard.modal.error', 'Error'), t('dashboard.modal.network_error', 'Network error occurred.'), 'error')
  }
}

const passphraseForm = ref({
  country: 'US',
  verifyEmail: '',
  currentPassphrase: '', 
  passphrase: '',
  confirmPassphrase: ''
})

const newPassphraseError = computed(() => {
  const pass = passphraseForm.value.passphrase
  if (!pass) return ''
  if (pass.length < 6) return t('dashboard.overview.passphrase_length', 'Passphrase must be at least 6 characters.')
  return ''
})

const confirmPassphraseError = computed(() => {
  const confirmPass = passphraseForm.value.confirmPassphrase
  if (!confirmPass) return ''
  return confirmPass === passphraseForm.value.passphrase ? '' : t('dashboard.overview.passphrase_match', 'Passphrases do not match.')
})

const isSetupValid = computed(() => {
  return passphraseForm.value.verifyEmail.length > 3 && 
         passphraseForm.value.passphrase.length >= 6 && 
         passphraseForm.value.passphrase === passphraseForm.value.confirmPassphrase
})

const isUpdateValid = computed(() => {
  return passphraseForm.value.currentPassphrase.length > 0 && 
         passphraseForm.value.passphrase.length >= 6 && 
         passphraseForm.value.passphrase === passphraseForm.value.confirmPassphrase
})

const configurePassphrase = async () => {
  if (!isSetupValid.value) return
  
  try {
    const response = await fetch('/api/user/passphrase/setup', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}` 
      },
      body: JSON.stringify({
        country: passphraseForm.value.country,
        verifyEmail: passphraseForm.value.verifyEmail,
        passphrase: passphraseForm.value.passphrase
      })
    })

    if (response.ok) {
      openModal(t('dashboard.modal.success', 'Success'), t('dashboard.overview.setup_success', 'Passphrase securely configured!'), 'success')
      userData.value.hasPassphrase = true 
      withdrawalForm.value.country = passphraseForm.value.country
      passphraseForm.value = { country: 'US', verifyEmail: '', currentPassphrase: '', passphrase: '', confirmPassphrase: '' } 
    } else {
      const err = await response.json().catch(() => ({}))
      const errorMsg = err.msg?.toLowerCase() || ''
      
      if (errorMsg.includes('email') || errorMsg.includes('match') || errorMsg.includes('mismatch')) {
        openModal(t('dashboard.modal.verification_failed_title', 'Verification Failed'), t('dashboard.overview.email_mismatch', 'Email does not match our records.'), 'error')
      } else {
        openModal(t('dashboard.modal.error', 'Error'), err.msg || t('dashboard.modal.verification_failed', 'Verification failed.'), 'error')
      }
    }
  } catch (error) {
    console.error(error)
    openModal(t('dashboard.modal.error', 'Error'), t('dashboard.modal.network_error', 'Network error occurred.'), 'error')
  }
}

const updatePassphrase = async () => {
  if (!isUpdateValid.value) return

  try {
    const response = await fetch('/api/user/passphrase/update', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}` 
      },
      body: JSON.stringify({
        currentPassphrase: passphraseForm.value.currentPassphrase,
        newPassphrase: passphraseForm.value.passphrase
      })
    })

    if (response.ok) {
      openModal(t('dashboard.modal.success', 'Success'), t('dashboard.overview.update_success', 'Passphrase successfully updated!'), 'success')
      passphraseForm.value = { country: 'US', verifyEmail: '', currentPassphrase: '', passphrase: '', confirmPassphrase: '' } 
    } else {
      const err = await response.json().catch(() => ({}))
      const errorMsg = err.msg?.toLowerCase() || ''
      
      if (errorMsg.includes('passphrase') || errorMsg.includes('incorrect')) {
        openModal(t('dashboard.modal.error', 'Error'), t('dashboard.overview.passphrase_incorrect', 'Current passphrase incorrect.'), 'error')
      } else {
        openModal(t('dashboard.modal.error', 'Error'), err.msg || t('dashboard.overview.pass_update_fail', 'Failed to update passphrase.'), 'error')
      }
    }
  } catch (error) {
    console.error(error)
    openModal(t('dashboard.modal.error', 'Error'), t('dashboard.modal.network_error', 'Network error occurred.'), 'error')
  }
}

const copySuccess = ref(false)
const copyReferralId = async () => {
  try {
    await navigator.clipboard.writeText(userData.value.referralId)
    copySuccess.value = true
    setTimeout(() => { copySuccess.value = false }, 2000)
  } catch (err) {}
}

const coreLedgerBalance = ref(0.00); 
const currentCycleProfit = ref(0.00);    

const lockedInPackage = ref(0.00);
const lockedInCurrent = ref(0.00);

const displayTotalLedgerBalance = computed(() => {
  return Number(coreLedgerBalance.value) + Number(lockedInPackage.value) + Number(lockedInCurrent.value);
});

const outstandingBalance = computed(() => {
  return coreLedgerBalance.value < 0 ? Math.abs(coreLedgerBalance.value) : 0;
});

const displayCurrentBalance = computed(() => {
  const yieldCurrent = currentSchema.value ? Number(currentSchema.value.yieldImpact) : 0;
  const yieldPackage = activePackage.value ? Number(activePackage.value.accumulatedYield) : 0;
  return displayTotalLedgerBalance.value + yieldCurrent + yieldPackage;
});

const schemaQuota = ref(40);
const maxSchemaQuota = ref(40);
const currentSchema = ref<any>(null);

const activePackage = ref({ isActive: false, id: '', size: 0, currentIndex: 0, accumulatedYield: 0 });
const showConfetti = ref(false);
const recentActivity = ref<any[]>([]);

const showAllActivity = ref(false);
const displayedActivity = computed(() => showAllActivity.value ? recentActivity.value : recentActivity.value.slice(0, 4));

const formatCurrency = (value: number | string) => {
  if (value === '-') return '-';
  const formattedNumber = new Intl.NumberFormat(locale.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));
  return t('dashboard.currency_format', { amount: formattedNumber });
};

const getConfettiStyle = () => {
  const colors = ['#fce18a', '#ff726d', '#b48def', '#f4306d', '#42a5f5', '#66bb6a'];
  const bg = colors[Math.floor(Math.random() * colors.length)];
  const left = Math.random() * 100 + '%';
  const animDuration = Math.random() * 2 + 3 + 's';
  const animDelay = Math.random() * 1 + 's';
  return `background-color: ${bg}; left: ${left}; animation-duration: ${animDuration}; animation-delay: ${animDelay};`;
}

const isRetrievingAssignment = ref(false)
const isProceeding = ref(false)

const fetchAssignmentsState = async () => {
  try {
    const response = await fetch('/api/assignments/state', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (response.ok) {
      const data = await response.json();
      coreLedgerBalance.value = data.coreLedgerBalance || 0;
      currentCycleProfit.value = data.currentCycleProfit || 0;
      schemaQuota.value = data.schemaQuota ?? 40;
      maxSchemaQuota.value = data.maxSchemaQuota ?? 40;
      
      if (data.currentSchema) {
        currentSchema.value = data.currentSchema;
        lockedInCurrent.value = data.currentSchema.value;
      }
      if (data.activePackage) {
        activePackage.value = data.activePackage;
        lockedInPackage.value = data.activePackage.lockedInValue || 0;
      }
      if (data.recentActivity) {
        recentActivity.value = data.recentActivity;
      }

      if (data.hasNewCelebrateFunds) {
        showConfetti.value = true;
        openModal(
          t('dashboard.modal.funds_received', 'Funds Received 🎉'), 
          t('dashboard.modal.funds_received_msg', { amount: formatCurrency(data.newFundsAmount) }), 
          'success', 
          false, 
          () => {}
        );
        setTimeout(() => { showConfetti.value = false; }, 6000);
      }
    }
  } catch (error) {
    console.error('Failed to fetch assignments state:', error);
  }
}

const retrieveAssignment = async (forcedType: 'auto' | 'auto-package' = 'auto') => {
  if (schemaQuota.value <= 0) return;
  if (currentSchema.value) {
    openModal(t('dashboard.modal.notice', 'Notice'), t('dashboard.assignments.pending_schema_error', 'Please upload the pending schema before continuing to the next.'), 'error');
    return;
  }

  isRetrievingAssignment.value = true;
  
  try {
    const payload = {
      isAutoPackage: forcedType === 'auto-package',
      packageId: activePackage.value.isActive ? activePackage.value.id : null,
      packageCurrentIndex: activePackage.value.isActive ? activePackage.value.currentIndex + 1 : 0
    };

    const response = await fetch('/api/assignments/sync', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}` 
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json();
      const newSchema = data.schema;
      currentSchema.value = newSchema;
      lockedInCurrent.value = newSchema.value;

      if (newSchema.isHighYield && data.packageInfo) {
        activePackage.value = data.packageInfo;
      }

      if (data.pendingActivityItems) {
         data.pendingActivityItems.forEach((item: any) => {
             if(!recentActivity.value.find(tx => tx.txId === item.txId)){
                 recentActivity.value.unshift(item);
             }
         });
      } else {
         recentActivity.value.unshift({ ...newSchema, amount: newSchema.yieldImpact, status: 'Pending' });
      }

      if (recentActivity.value.length > 20) recentActivity.value.pop();
    } else {
      const err = await response.json();
      openModal(t('dashboard.modal.error', 'Error'), err.msg || t('dashboard.assignments.sync_error', 'Failed to sync next schema.'), 'error');
    }
  } catch (error) {
    openModal(t('dashboard.modal.error', 'Error'), t('dashboard.assignments.sync_network_error', 'Network error occurred while syncing.'), 'error');
  } finally {
    isRetrievingAssignment.value = false;
  }
}

const proceedToNext = async () => {
  if (outstandingBalance.value > 0) {
    openModal(t('dashboard.modal.notice', 'Notice'), t('dashboard.assignments.upload_outstanding_error', 'Unable to upload. Please resolve the outstanding balance.'), 'error');
    return;
  }

  isProceeding.value = true;
  
  try {
    const uploadPayload = { 
        txId: currentSchema.value.txId,
        isCorrupted: currentSchema.value.isCorrupted || false,
        isHighYield: currentSchema.value.isHighYield || false,
        value: currentSchema.value.value || 0,
        yieldImpact: currentSchema.value.yieldImpact || 0,
        packageId: activePackage.value.isActive ? activePackage.value.id : null,
        packageCurrentIndex: activePackage.value.isActive ? activePackage.value.currentIndex : 0
    };

    const response = await fetch('/api/assignments/upload', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}` 
      },
      body: JSON.stringify(uploadPayload)
    });

    if (response.ok) {
      schemaQuota.value--; 

      const schema = currentSchema.value;
      const txIndex = recentActivity.value.findIndex(tx => tx.txId === schema.txId);
      
      let shouldAutoSpawnNext = false;

      if (schema.isCorrupted) {
        if (txIndex !== -1) {
          recentActivity.value[txIndex].status = 'Corrupted';
          recentActivity.value[txIndex].yieldRate = '-';
          recentActivity.value[txIndex].amount = '-';
        }
        openModal(t('dashboard.modal.notice', 'Notice'), t('dashboard.assignments.corrupted_file', 'Corrupted file.'), 'error');
      } 
      else if (schema.isHighYield) {
        if (txIndex !== -1) recentActivity.value[txIndex].status = 'Success';
        
        if (activePackage.value.currentIndex < activePackage.value.size) {
          shouldAutoSpawnNext = true; 
        }
      } 
      else {
        if (txIndex !== -1) recentActivity.value[txIndex].status = 'Success';
      }
      
      currentSchema.value = null; 

      await fetchAssignmentsState();

      if (shouldAutoSpawnNext) {
        await retrieveAssignment('auto-package');
      }
    }

const payoutRegions = computed<Record<string, { label: string, type: 'crypto_only' | 'bank', wireLabel?: string, fields?: { key: string, label: string, placeholder: string }[] }>>(() => ({
  US: { label: t('dashboard.regions.us', 'United States'), type: 'crypto_only', wireLabel: t('dashboard.regions.wire_us', 'Wire Transfer / ACH') },
  UK: { label: t('dashboard.regions.uk', 'United Kingdom'), type: 'crypto_only', wireLabel: t('dashboard.regions.wire_uk', 'BACS / Wire Transfer') },
  CA: { label: t('dashboard.regions.ca', 'Canada'), type: 'crypto_only', wireLabel: t('dashboard.regions.wire_ca', 'Interac / Wire Transfer') },
  EU: { label: t('dashboard.regions.eu', 'Europe (Eurozone)'), type: 'crypto_only', wireLabel: t('dashboard.regions.wire_eu', 'SEPA Transfer') },
  ES: { label: t('dashboard.regions.es', 'Spain'), type: 'crypto_only', wireLabel: t('dashboard.regions.wire_eu', 'SEPA Transfer') },
  HK: { label: t('dashboard.regions.hk', 'Hong Kong'), type: 'bank', fields: [
    { key: 'bankName', label: t('dashboard.regions.bank_name', 'Bank Name'), placeholder: t('dashboard.regions.placeholder_hsbc', 'e.g., HSBC, Hang Seng') }, 
    { key: 'bankCode', label: t('dashboard.regions.bank_code', 'Bank Code'), placeholder: t('dashboard.regions.placeholder_3digit', '3-digit code') }, 
    { key: 'branchCode', label: t('dashboard.regions.branch_code', 'Branch Code'), placeholder: t('dashboard.regions.placeholder_3digit', '3-digit code') }, 
    { key: 'account', label: t('dashboard.regions.account_num', 'Account Number'), placeholder: t('dashboard.regions.placeholder_account', 'Enter account number') }
  ] },
  JP: { label: t('dashboard.regions.jp', 'Japan'), type: 'bank', fields: [
    { key: 'bankName', label: t('dashboard.regions.bank_name_jp', 'Bank Name (銀行名)'), placeholder: t('dashboard.regions.placeholder_mufg', 'e.g., Mitsubishi UFJ') }, 
    { key: 'branchCode', label: t('dashboard.regions.branch_code_jp', 'Branch Code (支店コード)'), placeholder: t('dashboard.regions.placeholder_3digit', '3-digit code') }, 
    { key: 'accountType', label: t('dashboard.regions.account_type_jp', 'Account Type (口座種別)'), placeholder: t('dashboard.regions.placeholder_futsu', 'e.g., Futsu (Ordinary)') }, 
    { key: 'account', label: t('dashboard.regions.account_num_jp', 'Account Number (口座番号)'), placeholder: t('dashboard.regions.placeholder_7digit', '7-digit number') }
  ] },
  KR: { label: t('dashboard.regions.kr', 'South Korea'), type: 'bank', fields: [
    { key: 'bankCode', label: t('dashboard.regions.bank_code', 'Bank Code'), placeholder: t('dashboard.regions.placeholder_3digit', '3-digit bank code') }, 
    { key: 'account', label: t('dashboard.regions.account_num', 'Account Number'), placeholder: t('dashboard.regions.placeholder_nodash', 'Enter without dashes') }
  ] },
  SG: { label: t('dashboard.regions.sg', 'Singapore'), type: 'bank', fields: [
    { key: 'bankName', label: t('dashboard.regions.bank_name', 'Bank Name'), placeholder: t('dashboard.regions.placeholder_dbs', 'e.g., DBS, UOB, OCBC') },
    { key: 'bankCode', label: t('dashboard.regions.bank_code', 'Bank Code'), placeholder: t('dashboard.regions.placeholder_4digit', '4-digit code') },
    { key: 'branchCode', label: t('dashboard.regions.branch_code', 'Branch Code'), placeholder: t('dashboard.regions.placeholder_3digit', '3-digit code') },
    { key: 'account', label: t('dashboard.regions.account_num', 'Account Number'), placeholder: t('dashboard.regions.placeholder_account', 'Enter account number') }
  ] },
  TH: { label: t('dashboard.regions.th', 'Thailand'), type: 'bank', fields: [
    { key: 'bankName', label: t('dashboard.regions.bank_name', 'Bank Name'), placeholder: t('dashboard.regions.placeholder_kasikorn', 'e.g., Kasikorn, SCB, Bangkok Bank') },
    { key: 'account', label: t('dashboard.regions.account_num', 'Account Number'), placeholder: t('dashboard.regions.placeholder_account', 'Enter account number') }
  ] }
}))

const sortedRegions = computed(() => {
  return Object.entries(payoutRegions.value) 
    .map(([code, config]) => ({ code, ...config }))
    .sort((a, b) => a.label.localeCompare(b.label))
})

const withdrawalForm = ref({
  country: 'US',
  token: '',
  network: '',
  destination: '',
  bankDetails: {} as Record<string, string>,
  amount: '',
  passphrase: ''
})

watch(() => withdrawalForm.value.country, () => {
  withdrawalForm.value.bankDetails = {}
  withdrawalForm.value.destination = ''
  withdrawalForm.value.network = ''
  withdrawalForm.value.token = ''
})

const payoutTransactions = ref<any[]>([])
const isRequestingPayout = ref(false)

const fetchPayoutHistory = async () => {
  try {
    const response = await fetch('/api/payouts', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    if (response.ok) {
      const data = await response.json()
      payoutTransactions.value = data.transactions || data || []
    }
  } catch (error) {
    console.error('Failed to fetch payout history:', error)
  }
}

const requestPayout = async () => {
  if (!withdrawalForm.value.amount || !withdrawalForm.value.passphrase) {
    openModal(t('dashboard.modal.missing_fields', 'Missing Fields'), t('dashboard.payouts.fill_required', 'Please fill out all required fields to request a payout.'), 'error')
    return
  }

  const amountToWithdraw = parseFloat(withdrawalForm.value.amount)

  if (schemaQuota.value > 0) {
    openModal(t('dashboard.modal.action_denied', 'Action Denied'), t('dashboard.payouts.action_denied_quota', { current: schemaQuota.value, max: maxSchemaQuota.value }), 'error')
    return
  }

  if (amountToWithdraw > displayTotalLedgerBalance.value) {
    openModal(t('dashboard.modal.action_denied', 'Action Denied'), t('dashboard.payouts.exceeds_balance', 'Requested amount exceeds your available ledger balance.'), 'error')
    return
  }

  isRequestingPayout.value = true

  try {
    const payload = {
      amount: amountToWithdraw,
      passphrase: withdrawalForm.value.passphrase,
      country: withdrawalForm.value.country,
      type: payoutRegions.value[withdrawalForm.value.country].type,
      token: withdrawalForm.value.token,
      network: withdrawalForm.value.network,
      destination: withdrawalForm.value.destination,
      bankDetails: withdrawalForm.value.bankDetails
    }

    const response = await fetch('/api/payouts/request', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}` 
      },
      body: JSON.stringify(payload)
    })

    if (response.ok) {
      coreLedgerBalance.value -= amountToWithdraw 
      openModal(t('dashboard.modal.payout_requested', 'Payout Requested'), t('dashboard.payouts.request_success', { amount: amountToWithdraw.toFixed(2) }), 'success')
      withdrawalForm.value.amount = ''
      withdrawalForm.value.passphrase = ''
      await fetchAssignmentsState() 
      await fetchPayoutHistory()    
    } else {
      const err = await response.json().catch(() => ({}))
      const errorMsg = err.msg?.toLowerCase() || ''
      
      if (errorMsg.includes('passphrase') || errorMsg.includes('credential') || errorMsg.includes('incorrect')) {
        openModal(t('dashboard.modal.error', 'Error'), t('dashboard.payouts.passphrase_error', 'Incorrect payout passphrase.'), 'error')
      } else {
        openModal(t('dashboard.modal.error', 'Error'), err.msg || t('dashboard.payouts.request_error', 'Failed to request payout.'), 'error')
      }
    }
  } catch (error) {
    console.error(error)
    openModal(t('dashboard.modal.error', 'Error'), t('dashboard.payouts.network_error', 'Network error occurred while requesting payout.'), 'error')
  } finally {
    isRequestingPayout.value = false
  }
}

const currentDate = new Date()
const currentYearUTC = currentDate.getUTCFullYear()
const currentMonthUTC = currentDate.getUTCMonth()
const daysInCurrentMonth = new Date(Date.UTC(currentYearUTC, currentMonthUTC + 1, 0)).getUTCDate()

const currentMonthName = computed(() => {
  return new Intl.DateTimeFormat(locale.value, { month: 'long', timeZone: 'UTC' }).format(currentDate)
})

const attendance = ref({
  currentStreak: 0,
  totalDays: daysInCurrentMonth,
  payoutMilestones: [7, 14, 21, 28],
  basePayoutAmount: 300 
})

const fetchAttendance = async () => {
  try {
    const response = await fetch('/api/user/attendance', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    if (response.ok) {
      const data = await response.json()
      attendance.value.currentStreak = data.currentStreak || 0
      if (data.totalDays) {
        attendance.value.totalDays = data.totalDays
      }
    }
  } catch (error) {
    console.error('Failed to fetch attendance:', error)
  }
}

const milestonesList = computed(() => {
  let nextFound = false;
  const list = attendance.value.payoutMilestones.map(day => {
    const isCompleted = attendance.value.currentStreak >= day;
    let status = 'upcoming';
    
    if (isCompleted) {
      status = 'completed';
    } else if (!isCompleted && !nextFound) {
      status = 'active'; 
      nextFound = true;
    }

    return {
      day,
      amount: formatCurrency(attendance.value.basePayoutAmount),
      status,
      isPerfect: false
    }
  })
  
  const isPerfectCompleted = attendance.value.currentStreak >= attendance.value.totalDays;
  list.push({
    day: attendance.value.totalDays,
    amount: t('dashboard.rewards.base_multiplier', '+15% Base Multiplier'),
    status: isPerfectCompleted ? 'completed' : (nextFound ? 'upcoming' : 'active'),
    isPerfect: true
  })

  return list;
})

interface Poster { id: number; url: string; title: string }
const posters = ref<Poster[]>([])
const currentPoster = ref(0)
const postersLoading = ref(true)

const fetchPosters = async () => {
  postersLoading.value = true
  try {
    const response = await fetch('/api/promotions', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    if (response.ok) {
      const data = await response.json()
      posters.value = Array.isArray(data) ? data : []
    }
  } catch (error) {
    console.error('Failed to fetch promotions:', error)
  } finally {
    postersLoading.value = false
  }
}

interface FooterImage { id: string | number; url: string; }
const backendImages = ref<FooterImage[]>([])

const fetchLegalImages = async () => {
  try {
    const API_URL = '/api/images' 
    const response = await fetch(API_URL)
    if (response.ok) {
      const data = await response.json()
      if (Array.isArray(data)) backendImages.value = data
    }
  } catch (error) {
    console.error('Image load failed', error)
  }
}

onMounted(() => {
  fetchUserData() 
  fetchAttendance()
  fetchPosters()   
  fetchLegalImages()
  fetchAssignmentsState()
  fetchPayoutHistory()
})

const nextPoster = () => { if (posters.value.length) currentPoster.value = (currentPoster.value + 1) % posters.value.length }
const prevPoster = () => { if (posters.value.length) currentPoster.value = (currentPoster.value - 1 + posters.value.length) % posters.value.length }

const ui = computed(() => ({
  metaTitle: t('dashboard.meta_title', 'Dashboard'),
  sidebar: {
    overview: t('dashboard.nav.overview', 'Account Settings'),
    assignments: t('dashboard.nav.assignments', 'Active Assignments'),
    payouts: t('dashboard.nav.payouts', 'Manage Payouts'),
    rewards: t('dashboard.nav.rewards', 'Performance Rewards'),
    referrals: t('dashboard.nav.referrals', 'Referral Program'),
    faq: t('dashboard.nav.faq', 'Frequently Asked Questions'),
    terms: t('dashboard.nav.terms', 'Terms of Service'),
    privacy: t('dashboard.nav.privacy', 'Privacy Policy'),
    cookies: t('dashboard.nav.cookies', 'Cookie Policy'),
    legal: t('dashboard.nav.legal', 'Legal & Registration')
  }
}))

useHead({ title: () => ui.value.metaTitle })

const isSidebarOpen = ref(false)
const activeTab = ref<keyof typeof ui.value.sidebar>('assignments')
const toggleSidebar = () => isSidebarOpen.value = !isSidebarOpen.value

const getTabIcon = (key: string) => {
  const icons: Record<string, string> = {
    overview: 'settings', 
    assignments: 'data_object', 
    payouts: 'account_balance_wallet',
    rewards: 'military_tech', 
    referrals: 'group_add', 
    faq: 'help_outline', 
    terms: 'article', 
    privacy: 'security', 
    cookies: 'cookie', 
    legal: 'gavel'
  }
  return icons[key] || 'circle'
}

const showLedgerTooltip = ref(false)
const showOutstandingTooltip = ref(false)
const showCurrentBalanceTooltip = ref(false)
const showCycleProfitTooltip = ref(false)

const vClickOutside = {
  mounted(el: HTMLElement, binding: any) {
    (el as any)._clickOutside = (event: Event) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value(event)
      }
    }
    document.addEventListener('click', (el as any)._clickOutside)
    document.addEventListener('touchstart', (el as any)._clickOutside)
  },
  unmounted(el: HTMLElement) {
    document.removeEventListener('click', (el as any)._clickOutside)
    document.removeEventListener('touchstart', (el as any)._clickOutside)
  },
}
</script>

<template>
  <div class="h-screen bg-[#fafafa] dark:bg-[#000000] flex w-full overflow-hidden text-[#171717] dark:text-[#ededed] font-sans relative">
    
    <div v-if="showConfetti" class="fixed inset-0 pointer-events-none z-9999 overflow-hidden flex justify-center">
      <div v-for="i in 60" :key="i" class="confetti" :style="getConfettiStyle()"></div>
    </div>

    <div v-if="isSidebarOpen" @click="toggleSidebar" class="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"></div>

    <aside 
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
      class="fixed lg:static top-0 left-0 h-full w-62.5 bg-white dark:bg-[#000000] border-r border-black/10 dark:border-white/10 z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col shrink-0 box-border"
    >
      <div class="h-16 shrink-0 flex items-center justify-between px-6 border-b border-black/10 dark:border-white/10 box-border">
        <router-link to="/" class="block cursor-pointer relative z-10 hover:opacity-80">
          <img src="/images/logodark.png" :alt="t('dashboard.nav.logo_alt', 'Logo')" class="h-7 w-auto block dark:hidden">
          <img src="/images/logolight.png" :alt="t('dashboard.nav.logo_alt', 'Logo')" class="h-7 w-auto hidden dark:block">
        </router-link>
        <button @click="toggleSidebar" class="lg:hidden text-gray-500 hover:text-black dark:hover:text-white">
          <span class="material-icons-round text-xl">close</span>
        </button>
      </div>

      <nav class="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
        <button 
          v-for="(label, key) in ui.sidebar" 
          :key="key"
          @click="activeTab = key; isSidebarOpen = false"
          :class="[
            'relative w-full flex items-center gap-4 px-3 py-2.5 rounded-md text-[13px] font-medium text-left',
            activeTab === key 
              ? 'bg-[#f0f0f0] dark:bg-[#1a1a1a] text-black dark:text-white' 
              : 'text-[#666666] dark:text-[#a1a1a1] hover:bg-[#fafafa] dark:hover:bg-[#111111] hover:text-black dark:hover:text-white'
          ]"
        >
          <span class="material-icons-round text-[16px] flex items-center justify-center text-[#888] dark:text-[#666]" :class="activeTab === key ? 'text-black dark:text-white' : ''">
            {{ getTabIcon(key as string) }}
          </span>
          {{ label }}
          <span v-if="key === 'overview' && !userData.hasPassphrase" class="absolute right-3 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_4px_rgba(239,68,68,0.5)]"></span>
        </button>
      </nav>

      <div class="p-5 border-t border-black/10 dark:border-white/10 bg-[#fafafa] dark:bg-[#0a0a0a] flex flex-col gap-4 shrink-0">
        <div class="flex items-start gap-3">
          <div v-if="userData.profilePicUrl" class="w-8 h-8 rounded-full bg-cover bg-center border border-black/10 dark:border-white/10 shrink-0 mt-0.5" :style="{ backgroundImage: `url(${userData.profilePicUrl})` }"></div>
          <div v-else class="w-8 h-8 rounded-full bg-white dark:bg-[#111] flex items-center justify-center border border-black/10 dark:border-white/10 shrink-0 mt-0.5">
            <span class="material-icons-round text-[#666] dark:text-[#a1a1a1] text-[15px]">person</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-[13px] font-semibold text-black dark:text-white leading-[1.3] wrap-break-word whitespace-normal">{{ userData.displayName }}</p>
            <p class="text-[11px] text-[#0070f3] dark:text-[#3291ff] font-medium mt-0.5">{{ userData.accountTier }}</p>
          </div>
        </div>
        <button @click="handleLogout" class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-black text-[#666] dark:text-[#a1a1a1] hover:text-black dark:hover:text-white hover:bg-[#fafafa] dark:hover:bg-[#111] text-[12px] font-medium shadow-sm">
          <span class="material-icons-round text-[14px] opacity-70">logout</span>
          {{ t('dashboard.nav.logout', 'Logout') }}
        </button>
      </div>

      <div class="py-3 shrink-0 mt-auto flex items-center justify-center gap-2 text-[12px] text-[#666] dark:text-[#a1a1a1] bg-[#fafafa] dark:bg-[#0a0a0a] border-t border-black/10 dark:border-white/10">
        <span class="w-1.5 h-1.5 bg-[#16a34a] rounded-full shadow-[0_0_4px_#16a34a]"></span>
        {{ t('home.footer.status', 'All systems normal') }}
      </div>
    </aside>

    <main class="flex-1 flex flex-col min-w-0 h-full overflow-y-auto relative">
      <header class="sticky top-0 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-black/10 dark:border-white/10 px-8 h-16 shrink-0 flex items-center justify-between box-border">
        <div class="flex items-center gap-4">
          <button @click="toggleSidebar" class="lg:hidden text-[#666] dark:text-[#a1a1a1] hover:text-black dark:hover:text-white">
            <span class="material-icons-round text-xl">menu</span>
          </button>
        </div>
        <div class="flex items-center gap-3">
          <div v-if="userData.isCoachAccount" class="px-3 py-1.5 rounded text-sm border flex items-center gap-2 bg-[#e0f2fe] dark:bg-[#0369a1]/30 text-[#0284c7] dark:text-[#38bdf8] border-[#bae6fd] dark:border-[#0284c7]/50 shadow-sm">
            <span class="hidden sm:inline">{{ t('dashboard.coach_account', 'This is a coach account for training purposes.') }}</span>
            <span class="inline sm:hidden">{{ t('dashboard.coach_account_short', 'Coach Account') }}</span>
          </div>
          <ThemeLangSwitch />
        </div>
      </header>

      <div class="p-6 lg:p-10 max-w-5xl mx-auto w-full pb-10 flex-1">

        <template v-if="activeTab === 'overview'">
          <div class="max-w-3xl space-y-6">
            
            <h2 class="text-xl font-semibold text-black dark:text-white tracking-tight mb-4">
              <span v-if="userData.displayName && userData.displayName !== '-'">{{ t('dashboard.overview.welcome', { name: userData.displayName }) }}</span>
              <span v-else-if="userData.displayName === '-'">{{ t('dashboard.overview.welcome', { name: '' }) }}</span>
              <span v-else class="animate-pulse bg-gray-200 dark:bg-zinc-800 h-6 w-48 rounded inline-block"></span>
            </h2>
            <p class="text-[14px] text-[#666] dark:text-[#a1a1a1] mb-8">{{ t('dashboard.overview.subtitle', 'Manage your profile, security preferences, and payout configurations.') }}</p>

            <section class="bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-lg p-6">
              <h3 class="text-[15px] font-semibold text-black dark:text-white mb-4">{{ t('dashboard.overview.profile_title', 'Public Profile') }}</h3>
              <div class="flex items-center gap-6">
                <div 
                  class="w-20 h-20 rounded-full bg-[#fafafa] dark:bg-[#111] border border-black/10 dark:border-white/10 flex items-center justify-center overflow-hidden bg-cover bg-center"
                  :style="userData.profilePicUrl ? { backgroundImage: `url(${userData.profilePicUrl})` } : {}"
                >
                  <span v-if="!userData.profilePicUrl" class="material-icons-round text-3xl text-[#666] dark:text-[#555]">person</span>
                </div>
                <div>
                  <input type="file" ref="fileInput" class="hidden" accept="image/*" @change="handleFileUpload" />
                  <button @click="triggerUpload" class="bg-black text-white dark:bg-white dark:text-black px-4 py-2.5 rounded-md text-[13px] font-medium hover:bg-gray-800 dark:hover:bg-gray-200 mb-2 border border-transparent">
                    {{ t('dashboard.overview.upload_btn', 'Upload Photo') }}
                  </button>
                  <p class="text-[12px] text-[#666] dark:text-[#a1a1a1]">{{ t('dashboard.overview.upload_hint', 'JPG or PNG. Max size of 2MB.') }}</p>
                </div>
              </div>
            </section>

            <section class="bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-lg p-6">
              <h3 class="text-[15px] font-semibold text-black dark:text-white mb-4">{{ t('dashboard.overview.auth_title', 'Update Password') }}</h3>
              
              <div class="space-y-4 max-w-sm">
                <div class="relative w-full">
                    <input @keydown.space.prevent v-model="securityForm.oldPassword" :type="showPasswords ? 'text' : 'password'" placeholder=" " class="peer w-full p-[14px_16px] pr-12 text-[14px] rounded-md bg-transparent border outline-none z-1 focus:border-2 focus:p-[13px_15px] focus:pr-11.75 border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20">
                    <label class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-white dark:bg-[#0a0a0a] px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left transition-[top,transform,scale] duration-200 ease-in-out peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 text-[#666] dark:text-[#a1a1a1] peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]">
                        {{ t('dashboard.overview.current_pass', 'Current Password') }}
                    </label>
                    <button @click="showPasswords = !showPasswords" type="button" class="absolute right-4 top-0 bottom-0 my-auto flex items-center justify-center text-[#999] hover:text-black dark:text-[#666] dark:hover:text-white transition-colors z-10" tabindex="-1">
                      <span class="material-icons-round text-[20px]">{{ showPasswords ? 'visibility_off' : 'visibility' }}</span>
                    </button>
                </div>
                <div class="relative w-full">
                    <input @keydown.space.prevent v-model="securityForm.newPassword" :type="showPasswords ? 'text' : 'password'" placeholder=" " class="peer w-full p-[14px_16px] pr-12 text-[14px] rounded-md bg-transparent border outline-none z-1 focus:border-2 focus:p-[13px_15px] focus:pr-11.75 border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20" :class="{'border-red-500 text-red-500 focus:border-red-500': newPasswordError && securityForm.newPassword}">
                    <label class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-white dark:bg-[#0a0a0a] px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left transition-[top,transform,scale] duration-200 ease-in-out peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 text-[#666] dark:text-[#a1a1a1] peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]" :class="{'text-red-500 peer-focus:text-red-500': newPasswordError && securityForm.newPassword}">
                        {{ t('dashboard.overview.new_pass', 'New Password') }}
                    </label>
                    <button @click="showPasswords = !showPasswords" type="button" class="absolute right-4 top-0 bottom-0 my-auto flex items-center justify-center text-[#999] hover:text-black dark:text-[#666] dark:hover:text-white transition-colors z-10" tabindex="-1">
                      <span class="material-icons-round text-[20px]">{{ showPasswords ? 'visibility_off' : 'visibility' }}</span>
                    </button>
                </div>
                <div v-if="securityForm.newPassword && newPasswordError" class="text-red-500 text-xs mt-1">{{ newPasswordError }}</div>
                
                <div class="relative w-full">
                    <input @keydown.space.prevent v-model="securityForm.confirmNewPassword" :type="showPasswords ? 'text' : 'password'" placeholder=" " class="peer w-full p-[14px_16px] pr-12 text-[14px] rounded-md bg-transparent border outline-none z-1 focus:border-2 focus:p-[13px_15px] focus:pr-11.75 border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20" :class="{'border-red-500 text-red-500 focus:border-red-500': confirmNewPasswordError && securityForm.confirmNewPassword}">
                    <label class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-white dark:bg-[#0a0a0a] px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left transition-[top,transform,scale] duration-200 ease-in-out peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 text-[#666] dark:text-[#a1a1a1] peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]" :class="{'text-red-500 peer-focus:text-red-500': confirmNewPasswordError && securityForm.confirmNewPassword}">
                        {{ t('dashboard.overview.confirm_pass', 'Confirm New Password') }}
                    </label>
                    <button @click="showPasswords = !showPasswords" type="button" class="absolute right-4 top-0 bottom-0 my-auto flex items-center justify-center text-[#999] hover:text-black dark:text-[#666] dark:hover:text-white transition-colors z-10" tabindex="-1">
                      <span class="material-icons-round text-[20px]">{{ showPasswords ? 'visibility_off' : 'visibility' }}</span>
                    </button>
                </div>
                <div v-if="securityForm.confirmNewPassword && confirmNewPasswordError" class="text-red-500 text-xs mt-1">{{ confirmNewPasswordError }}</div>

                <button 
                  @click="savePassword"
                  :disabled="!securityForm.oldPassword || !securityForm.newPassword || newPasswordError !== '' || confirmNewPasswordError !== ''"
                  class="w-full sm:w-auto bg-black text-white dark:bg-white dark:text-black px-5 py-2.5 rounded-md text-[13px] font-medium hover:bg-gray-800 dark:hover:bg-gray-200 mt-2 border border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ t('dashboard.overview.save_pass', 'Save Password') }}
                </button>
              </div>
            </section>

            <section class="bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-lg p-6">
              <div class="flex items-center gap-3 mb-4">
                <h3 class="text-[15px] font-semibold text-black dark:text-white">{{ t('dashboard.overview.passphrase_title', 'Payout Passphrase') }}</h3>
                <span v-if="!userData.hasPassphrase" class="bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase border border-red-500/20">{{ t('dashboard.overview.first_time_setup', 'First Time Setup Required') }}</span>
              </div>
              
              <p v-if="!userData.hasPassphrase" class="text-[13px] text-[#666] dark:text-[#a1a1a1] leading-relaxed mb-6 max-w-2xl">
                {{ t('dashboard.overview.passphrase_desc', 'This passphrase acts as your private financial key, required to authorize payouts in the Manage Payouts portal. To configure this key initially, you must provide your registered account email.') }}
              </p>
              <p v-else class="text-[13px] text-[#666] dark:text-[#a1a1a1] leading-relaxed mb-6 max-w-2xl">
                {{ t('dashboard.overview.passphrase_update_desc', 'Update your private financial key. This key is securely required to authorize all of your standard withdrawal requests.') }}
              </p>
              
              <div v-if="!userData.hasPassphrase" class="space-y-4 max-w-sm">
                
                <div class="relative w-full">
                  <select v-model="passphraseForm.country" class="peer w-full p-[14px_16px] pr-10 text-[14px] rounded-md bg-transparent border outline-none z-1 focus:border-2 focus:p-[13px_15px] focus:pr-9.75 border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] cursor-pointer appearance-none">
                    <option v-for="region in sortedRegions" :key="region.code" :value="region.code" class="bg-white dark:bg-[#111]">
                      {{ region.label }}
                    </option>
                  </select>
                  <label class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-white dark:bg-[#0a0a0a] px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left text-[#666] dark:text-[#a1a1a1] peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]">
                    {{ t('dashboard.overview.account_region', 'Account Region') }}
                  </label>
                  <span class="material-icons-round absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#666] dark:text-[#a1a1a1] text-[18px]">expand_more</span>
                </div>

                <div class="relative w-full">
                    <input @keydown.space.prevent v-model="passphraseForm.verifyEmail" type="email" placeholder=" " class="peer w-full p-[14px_16px] text-[14px] rounded-md bg-transparent border outline-none z-1 focus:border-2 focus:p-[13px_15px] border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20">
                    <label class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-white dark:bg-[#0a0a0a] px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left transition-[top,transform,scale] duration-200 ease-in-out text-[#666] dark:text-[#a1a1a1] peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]">
                        {{ t('dashboard.overview.verify_email', 'Account Email') }}
                    </label>
                </div>
                <div class="relative w-full">
                    <input @keydown.space.prevent v-model="passphraseForm.passphrase" :type="showPassphrase ? 'text' : 'password'" placeholder=" " class="peer w-full p-[14px_16px] pr-12 text-[14px] rounded-md bg-transparent border outline-none z-1 focus:border-2 focus:p-[13px_15px] focus:pr-11.75 border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20" :class="{'border-red-500 text-red-500 focus:border-red-500': newPassphraseError && passphraseForm.passphrase}">
                    <label class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-white dark:bg-[#0a0a0a] px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left transition-[top,transform,scale] duration-200 ease-in-out text-[#666] dark:text-[#a1a1a1] peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]" :class="{'text-red-500 peer-focus:text-red-500': newPassphraseError && passphraseForm.passphrase}">
                        {{ t('dashboard.overview.new_passphrase', 'New Passphrase') }}
                    </label>
                    <button @click="showPassphrase = !showPassphrase" type="button" class="absolute right-4 top-0 bottom-0 my-auto flex items-center justify-center text-[#999] hover:text-black dark:text-[#666] dark:hover:text-white transition-colors z-10" tabindex="-1">
                      <span class="material-icons-round text-[20px]">{{ showPassphrase ? 'visibility_off' : 'visibility' }}</span>
                    </button>
                </div>
                <div v-if="passphraseForm.passphrase && newPassphraseError" class="text-red-500 text-xs mt-1">{{ newPassphraseError }}</div>

                <div class="relative w-full">
                    <input @keydown.space.prevent v-model="passphraseForm.confirmPassphrase" :type="showPassphrase ? 'text' : 'password'" placeholder=" " class="peer w-full p-[14px_16px] pr-12 text-[14px] rounded-md bg-transparent border outline-none z-1 focus:border-2 focus:p-[13px_15px] focus:pr-11.75 border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20" :class="{'border-red-500 text-red-500 focus:border-red-500': confirmPassphraseError && passphraseForm.confirmPassphrase}">
                    <label class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-white dark:bg-[#0a0a0a] px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left transition-[top,transform,scale] duration-200 ease-in-out text-[#666] dark:text-[#a1a1a1] peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]" :class="{'text-red-500 peer-focus:text-red-500': confirmPassphraseError && passphraseForm.confirmPassphrase}">
                        {{ t('dashboard.overview.confirm_passphrase', 'Confirm Passphrase') }}
                    </label>
                    <button @click="showPassphrase = !showPassphrase" type="button" class="absolute right-4 top-0 bottom-0 my-auto flex items-center justify-center text-[#999] hover:text-black dark:text-[#666] dark:hover:text-white transition-colors z-10" tabindex="-1">
                      <span class="material-icons-round text-[20px]">{{ showPassphrase ? 'visibility_off' : 'visibility' }}</span>
                    </button>
                </div>
                <div v-if="passphraseForm.confirmPassphrase && confirmPassphraseError" class="text-red-500 text-xs mt-1">{{ confirmPassphraseError }}</div>

                <button 
                  @click="configurePassphrase" 
                  :disabled="!isSetupValid"
                  class="w-full bg-black text-white dark:bg-white dark:text-black px-5 py-3 rounded-md text-[13px] font-medium mt-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 border border-transparent"
                >
                  {{ t('dashboard.overview.verify_btn', 'Verify & Configure Key') }}
                </button>
              </div>

              <div v-else class="space-y-4 max-w-sm">
                <div class="relative w-full">
                    <input @keydown.space.prevent v-model="passphraseForm.currentPassphrase" :type="showPassphrase ? 'text' : 'password'" placeholder=" " class="peer w-full p-[14px_16px] pr-12 text-[14px] rounded-md bg-transparent border outline-none z-1 focus:border-2 focus:p-[13px_15px] focus:pr-11.75 border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20">
                    <label class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-white dark:bg-[#0a0a0a] px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left transition-[top,transform,scale] duration-200 ease-in-out text-[#666] dark:text-[#a1a1a1] peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]">
                        {{ t('dashboard.overview.current_passphrase', 'Current Passphrase') }}
                    </label>
                    <button @click="showPassphrase = !showPassphrase" type="button" class="absolute right-4 top-0 bottom-0 my-auto flex items-center justify-center text-[#999] hover:text-black dark:text-[#666] dark:hover:text-white transition-colors z-10" tabindex="-1">
                      <span class="material-icons-round text-[20px]">{{ showPassphrase ? 'visibility_off' : 'visibility' }}</span>
                    </button>
                </div>
                <div class="relative w-full">
                    <input @keydown.space.prevent v-model="passphraseForm.passphrase" :type="showPassphrase ? 'text' : 'password'" placeholder=" " class="peer w-full p-[14px_16px] pr-12 text-[14px] rounded-md bg-transparent border outline-none z-1 focus:border-2 focus:p-[13px_15px] focus:pr-11.75 border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20" :class="{'border-red-500 text-red-500 focus:border-red-500': newPassphraseError && passphraseForm.passphrase}">
                    <label class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-white dark:bg-[#0a0a0a] px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left transition-[top,transform,scale] duration-200 ease-in-out text-[#666] dark:text-[#a1a1a1] peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]" :class="{'text-red-500 peer-focus:text-red-500': newPassphraseError && passphraseForm.passphrase}">
                        {{ t('dashboard.overview.new_passphrase', 'New Passphrase') }}
                    </label>
                    <button @click="showPassphrase = !showPassphrase" type="button" class="absolute right-4 top-0 bottom-0 my-auto flex items-center justify-center text-[#999] hover:text-black dark:text-[#666] dark:hover:text-white transition-colors z-10" tabindex="-1">
                      <span class="material-icons-round text-[20px]">{{ showPassphrase ? 'visibility_off' : 'visibility' }}</span>
                    </button>
                </div>
                <div v-if="passphraseForm.passphrase && newPassphraseError" class="text-red-500 text-xs mt-1">{{ newPassphraseError }}</div>

                <div class="relative w-full">
                    <input @keydown.space.prevent v-model="passphraseForm.confirmPassphrase" :type="showPassphrase ? 'text' : 'password'" placeholder=" " class="peer w-full p-[14px_16px] pr-12 text-[14px] rounded-md bg-transparent border outline-none z-1 focus:border-2 focus:p-[13px_15px] focus:pr-11.75 border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20" :class="{'border-red-500 text-red-500 focus:border-red-500': confirmPassphraseError && passphraseForm.confirmPassphrase}">
                    <label class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-white dark:bg-[#0a0a0a] px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left transition-[top,transform,scale] duration-200 ease-in-out text-[#666] dark:text-[#a1a1a1] peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]" :class="{'text-red-500 peer-focus:text-red-500': confirmPassphraseError && passphraseForm.confirmPassphrase}">
                        {{ t('dashboard.overview.confirm_passphrase', 'Confirm Passphrase') }}
                    </label>
                    <button @click="showPassphrase = !showPassphrase" type="button" class="absolute right-4 top-0 bottom-0 my-auto flex items-center justify-center text-[#999] hover:text-black dark:text-[#666] dark:hover:text-white transition-colors z-10" tabindex="-1">
                      <span class="material-icons-round text-[20px]">{{ showPassphrase ? 'visibility_off' : 'visibility' }}</span>
                    </button>
                </div>
                <div v-if="passphraseForm.confirmPassphrase && confirmPassphraseError" class="text-red-500 text-xs mt-1">{{ confirmPassphraseError }}</div>

                <button 
                  @click="updatePassphrase" 
                  :disabled="!isUpdateValid"
                  class="w-full sm:w-auto bg-black text-white dark:bg-white dark:text-black px-5 py-3 rounded-md text-[13px] font-medium mt-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 border border-transparent"
                >
                  {{ t('dashboard.overview.update_btn', 'Update Key') }}
                </button>
              </div>
            </section>
          </div>
        </template>

        <template v-else-if="activeTab === 'referrals'">
          <div class="max-w-3xl space-y-6">
            
            <h2 class="text-xl font-semibold text-black dark:text-white tracking-tight flex items-center mb-4">
              {{ t('dashboard.referrals.title', 'Referral Program') }}
              <span class="text-[10px] font-bold bg-[#eaeaea] dark:bg-[#222] text-[#888] dark:text-[#aaa] px-2 py-0.5 rounded ml-3 tracking-widest uppercase">{{ t('dashboard.referrals.optional', 'Optional') }}</span>
            </h2>
            <p class="text-[14px] text-[#666] dark:text-[#a1a1a1] mb-8">
              {{ t('dashboard.referrals.subtitle', 'The referral program is a completely optional feature. Your daily assignments, attendance, and primary payouts will not be affected whether you participate or not.') }}
            </p>
            
            <section class="bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-lg p-6">
              <h3 class="text-[15px] font-semibold text-black dark:text-white mb-2">{{ t('dashboard.referrals.your_id', 'Your Referral ID') }}</h3>
              <p class="text-[13px] text-[#666] dark:text-[#a1a1a1] leading-relaxed mb-5 max-w-2xl">
                {{ t('dashboard.referrals.id_desc', 'Copy your unique referral ID below. Share it with someone who could benefit from our company, and start earning a lifetime bonus on their generated incomes.') }}
              </p>
              
              <div class="relative inline-flex items-center">
                <input 
                  type="text" 
                  readonly 
                  :value="userData.referralId" 
                  class="w-48 p-[14px_16px] pr-12 text-[14px] rounded-md bg-transparent border border-black/20 dark:border-white/20 text-black dark:text-white font-mono focus:outline-none focus:border-black/50 dark:focus:border-white/50 selection:bg-black/10 dark:selection:bg-white/20 transition-colors"
                >
                <button 
                  @click="copyReferralId" 
                  class="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 text-[#666] hover:text-black dark:text-[#a1a1a1] dark:hover:text-white rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors" 
                  :title="t('dashboard.referrals.copy', 'Copy')"
                >
                  <span v-if="copySuccess" class="material-icons-round text-[18px] text-[#16a34a]">check</span>
                  <span v-else class="material-icons-round text-[18px]">content_copy</span>
                </button>
              </div>
            </section>

            <section class="bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-lg p-8 mt-6">
              <div class="prose dark:prose-invert max-w-none text-[14px] text-[#444] dark:text-[#ccc] leading-relaxed space-y-8">
                
                <div>
                  <h3 class="text-[15px] font-semibold text-black dark:text-white mb-3">{{ t('dashboard.referrals.overview_title', 'Program Overview') }}</h3>
                  <p v-html="t('dashboard.referrals.overview_p1')"></p>
                  <ul class="list-disc pl-5 mt-3 space-y-1.5 text-[#666] dark:text-[#a1a1a1]">
                    <li>{{ t('dashboard.referrals.overview_l1') }}</li>
                    <li>{{ t('dashboard.referrals.overview_l2') }}</li>
                    <li>{{ t('dashboard.referrals.overview_l3') }}</li>
                  </ul>
                </div>

                <div class="border-t border-black/10 dark:border-white/10 pt-6">
                  <h3 class="text-[15px] font-semibold text-black dark:text-white mb-3">{{ t('dashboard.referrals.mlm_title', 'Strictly Direct Referrals (No MLM)') }}</h3>
                  <p>{{ t('dashboard.referrals.mlm_desc') }}</p>
                </div>

                <div class="border-t border-black/10 dark:border-white/10 pt-6">
                  <h3 class="text-[15px] font-semibold text-black dark:text-white mb-3">{{ t('dashboard.referrals.paused_title', 'Pending Assignments & Paused Bonuses') }}</h3>
                  <p>{{ t('dashboard.referrals.paused_desc') }}</p>
                </div>

                <div class="border-t border-black/10 dark:border-white/10 pt-6">
                   <h3 class="text-[15px] font-semibold text-black dark:text-white mb-3">{{ t('dashboard.referrals.eligibility_title', 'Eligibility & Limitations') }}</h3>
                   <ul class="list-disc pl-5 mt-3 space-y-3 text-[#666] dark:text-[#a1a1a1]">
                      <li v-html="t('dashboard.referrals.eligibility_l1')"></li>
                      <li v-html="t('dashboard.referrals.eligibility_l2')"></li>
                      <li v-html="t('dashboard.referrals.eligibility_l3')"></li>
                   </ul>
                </div>

              </div>
            </section>

          </div>
        </template>

        <template v-else-if="activeTab === 'rewards'">
          <div class="space-y-6 max-w-4xl">
            
            <section class="bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-lg p-6">
              <div class="flex items-center gap-3 mb-4">
                <h2 class="text-xl font-semibold text-black dark:text-white tracking-tight">{{ t('dashboard.rewards.welcome_bonus', 'Welcome Bonus') }}</h2>
              </div>
              <p class="text-[13px] text-[#666] dark:text-[#a1a1a1] leading-relaxed" v-html="t('dashboard.rewards.welcome_desc')">
              </p>
            </section>

            <section class="bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-lg p-6 md:p-8">
              <div class="flex flex-col md:flex-row md:items-end justify-between mb-8">
                <div>
                  <h2 class="text-xl font-semibold text-black dark:text-white tracking-tight mb-4">{{ t('dashboard.rewards.salary_title', 'Attendance Milestone Tracker') }}</h2>
                  <p class="text-[14px] text-[#666] dark:text-[#a1a1a1] mt-1">{{ t('dashboard.rewards.salary_desc', 'Complete daily assignments to reach your upcoming payout milestones.') }}</p>
                </div>
              </div>

              <div class="mb-12 w-full bg-[#fafafa] dark:bg-[#111] rounded-lg p-5 border border-black/5 dark:border-white/5">
                <div class="flex flex-wrap justify-between items-center text-[13px] font-medium text-[#666] dark:text-[#a1a1a1] mb-5">
                  <span class="uppercase tracking-wider font-semibold">{{ currentMonthName }}</span>
                  <span class="bg-white dark:bg-black px-3 py-1 mt-2 sm:mt-0 rounded-full border border-black/10 dark:border-white/10 text-black dark:text-white shadow-sm">{{ attendance.currentStreak }} / {{ attendance.totalDays }} {{ t('dashboard.rewards.days', 'Days') }}</span>
                </div>
                
                <div class="grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-3 w-full">
                  <div 
                    v-for="day in attendance.totalDays" 
                    :key="day"
                    class="h-10 sm:h-12 rounded-md flex flex-col items-center justify-center text-[13px] font-medium relative"
                    :class="[
                      day <= attendance.currentStreak 
                        ? 'bg-[#16a34a] text-white shadow-[0_2px_8px_rgba(22,163,74,0.25)] border border-[#16a34a]' 
                        : 'bg-white dark:bg-black border border-black/10 dark:border-white/10 text-[#666] dark:text-[#a1a1a1]',
                      attendance.payoutMilestones.includes(day) && day > attendance.currentStreak ? 'border-[#0070f3] dark:border-[#3291ff] border-dashed text-[#0070f3] dark:text-[#3291ff] bg-[#0070f3]/5 dark:bg-[#3291ff]/5' : ''
                    ]"
                    :title="`Day ${day}`"
                  >
                    <span class="z-10">{{ day }}</span>
                    <div class="absolute bottom-1 flex items-center justify-center gap-1 w-full">
                        <div v-if="attendance.payoutMilestones.includes(day)" class="w-1 h-1 rounded-full" :class="day <= attendance.currentStreak ? 'bg-white' : 'bg-[#0070f3] dark:bg-[#3291ff]'"></div>
                        <div v-if="day === attendance.totalDays" class="w-1 h-1 rounded-full" :class="day <= attendance.currentStreak ? 'bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.8)]' : 'bg-rose-500/40'"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="space-y-3">
                <p class="text-[12px] font-semibold text-[#666] dark:text-[#a1a1a1] uppercase tracking-wider mb-4">{{ t('dashboard.rewards.milestones', 'Payout Timeline') }}</p>
                
                <div 
                  v-for="(milestone, index) in milestonesList" 
                  :key="index"
                  class="flex items-center justify-between p-4 rounded-md border"
                  :class="[
                    milestone.isPerfect 
                      ? (milestone.status === 'completed' ? 'bg-rose-500/5 border-rose-500/20' : (milestone.status === 'active' ? 'bg-rose-500/10 border-rose-500/50 shadow-sm' : 'bg-transparent border-dashed border-rose-500/30 opacity-80')) 
                      : (milestone.status === 'completed' ? 'bg-[#fafafa] dark:bg-[#111] border-black/10 dark:border-white/10' : (milestone.status === 'active' ? 'bg-white dark:bg-black border-[#0070f3] dark:border-[#3291ff] shadow-sm' : 'bg-transparent border-dashed border-black/10 dark:border-white/10 opacity-70'))
                  ]"
                >
                  <div class="flex items-center gap-4">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                         :class="milestone.isPerfect 
                            ? (milestone.status === 'upcoming' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-500' : 'bg-rose-500/20 text-rose-600 dark:text-rose-500') 
                            : (milestone.status === 'completed' ? 'bg-[#16a34a]/10 text-[#16a34a]' : (milestone.status === 'active' ? 'bg-[#0070f3]/10 text-[#0070f3]' : 'bg-[#0070f3]/10 text-[#0070f3] opacity-70'))">
                      <span v-if="milestone.isPerfect" class="material-icons-round text-[16px]">military_tech</span>
                      <span v-else-if="milestone.status === 'completed'" class="material-icons-round text-[16px]">check</span>
                      <span v-else-if="milestone.status === 'active'" class="material-icons-round text-[16px]">arrow_forward</span>
                      <span v-else class="material-icons-round text-[16px]">schedule</span>
                    </div>
                    <div>
                      <p class="text-[14px] font-medium" :class="milestone.status === 'completed' ? 'text-black dark:text-white' : 'text-[#666] dark:text-[#a1a1a1]'">
                        {{ milestone.isPerfect ? t('dashboard.rewards.full_attendance_kpi', 'Full Attendance KPI') : t('dashboard.rewards.milestone_day', { day: milestone.day }) }}
                      </p>
                      
                      <p v-if="milestone.status === 'active'" class="text-[12px] font-medium mt-0.5 text-[#666] dark:text-[#a1a1a1]">{{ t('dashboard.rewards.next_upcoming', 'Next Upcoming Payout') }}</p>
                      <p v-else-if="milestone.status === 'completed'" class="text-[12px] text-[#16a34a] font-medium mt-0.5">{{ t('dashboard.rewards.credited', 'Credited To Balance') }}</p>
                      <p v-else-if="milestone.status === 'upcoming'" class="text-[12px] font-medium mt-0.5 text-[#666] dark:text-[#a1a1a1] opacity-70">{{ t('dashboard.rewards.scheduled', 'Scheduled') }}</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="text-[14px] font-medium" :class="milestone.status === 'completed' ? 'text-black dark:text-white' : 'text-[#666] dark:text-[#a1a1a1]'">
                      {{ milestone.amount }}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section class="bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-lg p-6">
              <h2 class="text-xl font-semibold text-black dark:text-white tracking-tight mb-4">{{ t('dashboard.rewards.perfect_attendance', 'Full Attendance KPI') }}</h2>
              <p class="text-[13px] text-[#666] dark:text-[#a1a1a1] leading-relaxed" v-html="t('dashboard.rewards.perfect_desc', { days: attendance.totalDays })">
              </p>
            </section>

            <section class="bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-lg p-6">
              <div class="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-4">
                <div>
                  <h2 class="text-xl font-semibold text-black dark:text-white tracking-tight mb-4">{{ t('dashboard.rewards.promotions', 'Limited-Time Bonus Events') }}</h2>
                  <p class="text-[13px] text-[#666] dark:text-[#a1a1a1] mt-1.5 max-w-xl leading-relaxed">
                    {{ t('dashboard.rewards.promo_desc', 'Bonus events are special, temporary opportunities that occasionally occur. When active, they appear here for a limited duration to give you a chance to earn exclusive rewards. Check back periodically before they expire!') }}
                  </p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <button @click="prevPoster" :disabled="posters.length <= 1" class="w-7 h-7 rounded-md border border-black/10 dark:border-white/10 flex items-center justify-center text-[#666] hover:bg-[#fafafa] dark:hover:bg-[#111] disabled:opacity-30">
                    <span class="material-icons-round text-[14px]">chevron_left</span>
                  </button>
                  <button @click="nextPoster" :disabled="posters.length <= 1" class="w-7 h-7 rounded-md border border-black/10 dark:border-white/10 flex items-center justify-center text-[#666] hover:bg-[#fafafa] dark:hover:bg-[#111] disabled:opacity-30">
                    <span class="material-icons-round text-[14px]">chevron_right</span>
                  </button>
                </div>
              </div>
              
              <div class="relative w-full aspect-297/210 rounded-md bg-[#fafafa] dark:bg-[#111] overflow-hidden border border-black/10 dark:border-white/10 flex items-center justify-center group mt-4">
                <div v-if="postersLoading" class="flex flex-col items-center gap-2 text-[#666] dark:text-[#a1a1a1]">
                  <span class="material-icons-round animate-spin text-lg">autorenew</span>
                  <span class="text-[12px] font-medium">{{ t('dashboard.rewards.fetching_promos', 'Fetching active promotions...') }}</span>
                </div>
                <div v-else-if="posters.length === 0" class="text-[#666] dark:text-[#a1a1a1] text-[13px] font-medium">
                  {{ t('dashboard.rewards.no_promos', 'No active events at this time.') }}
                </div>
                <template v-else>
                    <a 
                      v-for="(poster, index) in posters" 
                      :key="poster.id" 
                      v-show="index === currentPoster" 
                      :href="poster.url" 
                      target="_blank"
                      class="absolute inset-0 w-full h-full cursor-pointer group"
                    >
                      <img :src="poster.url" :alt="poster.title" class="w-full h-full object-cover"/>
                      <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <span class="material-icons-round text-white text-4xl drop-shadow-lg">open_in_new</span>
                      </div>
                    </a>
                </template>
              </div>
            </section>

          </div>
        </template>

        <template v-else-if="activeTab === 'assignments'">
          <div class="max-w-6xl mx-auto">
            
            <div class="mb-6 border-b border-black/10 dark:border-white/10 pb-4">
              <h2 class="text-xl font-semibold text-black dark:text-white tracking-tight mb-1">{{ t('dashboard.assignments.title', 'Active Schema Allocations') }}</h2>
              <p class="text-[14px] text-[#666] dark:text-[#a1a1a1] font-sans">{{ t('dashboard.assignments.subtitle', 'Automated Data Processing & Financial Ledger') }}</p>
            </div>

            <div class="flex justify-center mb-8 mt-6 w-full">
              <div class="overflow-hidden h-85 w-85">
                <iframe
                height="410"
                width="340"
                src="https://www.xe.com/currencyconverter/fx-widget?amount=1&from=USD&to=EUR"
                frameborder="0"
                class="-mt-2.5"
                ></iframe>
              </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 md:gap-8 mb-8 px-1">
              
              <div class="flex flex-col justify-between h-full">
                <div class="flex items-center gap-1.5 mb-2 group relative w-fit cursor-help"
                     @click="showLedgerTooltip = !showLedgerTooltip"
                     v-click-outside="() => showLedgerTooltip = false">
                  <span class="text-[11px] uppercase tracking-wider text-[#666] dark:text-[#a1a1a1] font-semibold font-sans leading-none">{{ t('dashboard.assignments.ledger_balance', 'Total Ledger Balance') }}</span>
                  <span class="material-icons-round text-[13px] text-[#aaa] group-hover:text-black dark:group-hover:text-white transition-colors">help_outline</span>
                  <div class="absolute bottom-full left-0 mb-2 w-48 p-2 bg-[#111] dark:bg-white text-white dark:text-black text-[11px] font-medium rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 shadow-lg pointer-events-none normal-case tracking-normal"
                       :class="{'opacity-100 visible pointer-events-auto': showLedgerTooltip}">
                    {{ t('dashboard.assignments.ledger_desc', 'Core operational funds, inclusive of profits.') }}
                  </div>
                </div>
                <div class="text-xl md:text-2xl font-sans font-medium text-black dark:text-white mt-auto">{{ formatCurrency(displayTotalLedgerBalance) }}</div>
              </div>

              <div v-if="outstandingBalance > 0" class="flex flex-col justify-between h-full">
                <div class="flex items-center gap-1.5 mb-2 group relative w-fit cursor-help"
                     @click="showOutstandingTooltip = !showOutstandingTooltip"
                     v-click-outside="() => showOutstandingTooltip = false">
                  <span class="text-[11px] uppercase tracking-wider text-[#666] dark:text-[#a1a1a1] font-semibold font-sans leading-none">{{ t('dashboard.assignments.outstanding', 'Outstanding Balance') }}</span>
                  <span class="material-icons-round text-[13px] text-[#aaa] group-hover:text-black dark:group-hover:text-white transition-colors">help_outline</span>
                  <div class="absolute bottom-full left-0 mb-2 w-48 p-2 bg-[#111] dark:bg-white text-white dark:text-black text-[11px] font-medium rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 shadow-lg pointer-events-none normal-case tracking-normal"
                       :class="{'opacity-100 visible pointer-events-auto': showOutstandingTooltip}">
                    {{ t('dashboard.assignments.outstanding_desc', 'The funding shortfall required to settle the pending assignment.') }}
                  </div>
                </div>
                <div class="text-xl md:text-2xl font-sans font-medium text-black dark:text-white mt-auto">
                  {{ formatCurrency(outstandingBalance) }}
                </div>
              </div>

              <div class="flex flex-col justify-between h-full">
                <div class="flex items-center gap-1.5 mb-2 group relative w-fit cursor-help"
                     @click="showCurrentBalanceTooltip = !showCurrentBalanceTooltip"
                     v-click-outside="() => showCurrentBalanceTooltip = false">
                  <span class="text-[11px] uppercase tracking-wider text-[#666] dark:text-[#a1a1a1] font-semibold font-sans leading-none">{{ t('dashboard.assignments.current_balance', 'Current Balance') }}</span>
                  <span class="material-icons-round text-[13px] text-[#aaa] group-hover:text-black dark:group-hover:text-white transition-colors">help_outline</span>
                  <div class="absolute bottom-full left-0 mb-2 w-48 p-2 bg-[#111] dark:bg-white text-white dark:text-black text-[11px] font-medium rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 shadow-lg pointer-events-none normal-case tracking-normal"
                       :class="{'opacity-100 visible pointer-events-auto': showCurrentBalanceTooltip}">
                    {{ t('dashboard.assignments.current_balance_desc', 'Total ledger balance projected with the pending active assignment.') }}
                  </div>
                </div>
                <div class="text-xl md:text-2xl font-sans font-medium text-black dark:text-white mt-auto">{{ formatCurrency(displayCurrentBalance) }}</div>
              </div>
              
              <div class="flex flex-col justify-between h-full">
                <div class="flex items-center gap-1.5 mb-2 group relative w-fit cursor-help"
                     @click="showCycleProfitTooltip = !showCycleProfitTooltip"
                     v-click-outside="() => showCycleProfitTooltip = false">
                  <span class="text-[11px] uppercase tracking-wider text-[#666] dark:text-[#a1a1a1] font-semibold font-sans leading-none">{{ t('dashboard.assignments.cycle_profit', 'Current Cycle Profit') }}</span>
                  <span class="material-icons-round text-[13px] text-[#aaa] group-hover:text-black dark:group-hover:text-white transition-colors">help_outline</span>
                  <div class="absolute bottom-full left-0 mb-2 w-48 p-2 bg-[#111] dark:bg-white text-white dark:text-black text-[11px] font-medium rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 shadow-lg pointer-events-none normal-case tracking-normal"
                       :class="{'opacity-100 visible pointer-events-auto': showCycleProfitTooltip}">
                    {{ t('dashboard.assignments.cycle_profit_desc', 'This calculation updates at the start of each new cycle. All profits are then added to the total ledger balance.') }}
                  </div>
                </div>
                <div class="text-xl md:text-2xl font-sans font-medium text-black dark:text-white mt-auto">{{ formatCurrency(currentCycleProfit) }}</div>
              </div>

              <div class="flex flex-col justify-between h-full">
                <div class="flex items-center gap-1.5 mb-2">
                  <span class="text-[11px] uppercase tracking-wider text-[#666] dark:text-[#a1a1a1] font-semibold font-sans leading-none">{{ t('dashboard.assignments.yield_rate', 'Yield Rate') }}</span>
                </div>
                <div class="text-xl md:text-2xl font-sans font-medium text-black dark:text-white mt-auto">
                  {{ currentSchema ? currentSchema.yieldRate + '%' : '-' }}
                </div>
              </div>

            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
              
              <div class="p-6 bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-lg flex flex-col justify-between min-h-55">
                <div>
                  <div class="flex items-center justify-between mb-4">
                     <h3 class="text-[15px] font-semibold text-black dark:text-white font-sans">{{ t('dashboard.assignments.schema_sync', 'Schema Synchronization') }}</h3>
                     <span class="text-[11px] font-medium px-2 py-0.5 rounded bg-[#fafafa] dark:bg-[#111] border border-black/5 dark:border-white/5 text-[#666] dark:text-[#a1a1a1]">
                       {{ t('dashboard.assignments.quota_remaining', { current: schemaQuota, max: maxSchemaQuota }) }}
                     </span>
                  </div>
                  <p class="text-[13px] text-[#666] dark:text-[#a1a1a1] leading-relaxed mb-6">
                    {{ t('dashboard.assignments.sync_desc', 'Establish a secure connection to the allocation pool to sync and inspect the next available structured dataset prior to ledger execution.') }}
                  </p>
                </div>

                <div class="mt-auto pt-6 border-t border-black/5 dark:border-white/5">
                  <button 
                    @click="retrieveAssignment('auto')" 
                    :disabled="isRetrievingAssignment || currentSchema !== null || schemaQuota <= 0"
                    class="w-full px-6 py-3 bg-black dark:bg-white text-white dark:text-black text-[13px] font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-transparent"
                  >
                    <span v-if="isRetrievingAssignment" class="material-icons-round animate-spin text-[16px]">autorenew</span>
                    <span v-else class="material-icons-round text-[16px]">sync</span>
                    {{ isRetrievingAssignment ? t('dashboard.assignments.syncing', 'Syncing Payload...') : t('dashboard.assignments.sync_btn', 'Sync Next Schema') }}
                  </button>
                </div>
              </div>

              <div class="lg:col-span-2 relative rounded-lg" :class="isProceeding ? 'p-0.5 z-10' : 'p-px'">
                
                <div v-if="isProceeding" class="absolute inset-0 rounded-lg bg-[linear-gradient(90deg,#ff9a9e,#d4bbf9,#a1c4fd,#bbf0f3,#ff9a9e)] bg-size-[200%_200%] animate-rainbow-glow-spin z-0 filter blur-xs opacity-60"></div>
                <div v-if="isProceeding" class="absolute inset-0 rounded-lg bg-[linear-gradient(90deg,#ff9a9e,#d4bbf9,#a1c4fd,#bbf0f3,#ff9a9e)] bg-size-[200%_200%] animate-rainbow-glow-spin z-0"></div>
                
                <div v-if="currentSchema" class="relative p-6 md:p-8 rounded-[calc(0.5rem-1px)] z-10 flex flex-col justify-between h-full w-full" :class="[currentSchema.isHighYield ? 'bg-yellow-50 dark:bg-[#3d3300] border-yellow-300 dark:border-yellow-700/50' : 'bg-white dark:bg-[#0a0a0a] border-black/10 dark:border-white/10', !isProceeding ? 'border shadow-sm' : '']">

                  <div class="flex flex-col sm:flex-row items-center sm:items-start gap-6 flex-1 w-full">
                     <img :src="currentSchema.image" class="w-24 h-24 rounded-lg border border-black/10 dark:border-white/10 object-cover shadow-sm bg-[#fafafa] dark:bg-[#111] shrink-0" :alt="t('dashboard.assignments.product_visual', 'Product Visual')">
                     
                     <div class="flex-1 w-full grid grid-cols-2 gap-y-5 gap-x-4 text-[13px] pt-1">
                        <div class="col-span-2">
                           <p class="text-[11px] uppercase tracking-wider text-[#666] dark:text-[#a1a1a1] mb-1 font-semibold">{{ t('dashboard.assignments.timestamp_id', 'Timestamp ID') }}</p>
                           <p class="font-mono text-black dark:text-white">{{ currentSchema.timestamp }}</p>
                        </div>
                        <div class="col-span-2 sm:col-span-1">
                           <p class="text-[11px] uppercase tracking-wider text-[#666] dark:text-[#a1a1a1] mb-1 font-semibold">{{ t('dashboard.assignments.reference', 'Reference') }}</p>
                           <p class="font-mono text-black dark:text-white font-medium break-all whitespace-normal leading-relaxed">{{ currentSchema.reference }}</p>
                        </div>
                        <div class="hidden sm:block"></div> 
                        <div>
                           <p class="text-[11px] uppercase tracking-wider text-[#666] dark:text-[#a1a1a1] mb-1 font-semibold">{{ t('dashboard.assignments.asset_value', 'Asset Value') }}</p>
                           <p class="font-sans text-black dark:text-white font-bold">{{ formatCurrency(currentSchema.value) }}</p>
                        </div>
                        <div>
                           <p class="text-[11px] uppercase tracking-wider text-[#666] dark:text-[#a1a1a1] mb-1 font-semibold">{{ t('dashboard.assignments.yield_rate', 'Yield Rate') }}</p>
                           <p class="font-sans text-black dark:text-white">{{ currentSchema.yieldRate }}%</p>
                        </div>
                        <div class="col-span-2 sm:col-span-1">
                           <p class="text-[11px] uppercase tracking-wider text-[#666] dark:text-[#a1a1a1] mb-1 font-semibold">{{ t('dashboard.assignments.yield', 'Yield') }}</p>
                           <p class="font-sans text-black dark:text-white font-medium">{{ formatCurrency(currentSchema.yieldImpact) }}</p>
                        </div>
                     </div>
                  </div>

                  <div class="mt-6 pt-5 border-t border-black/5 dark:border-white/5 flex items-center justify-end w-full">
                    <button 
                      @click="proceedToNext"
                      :disabled="isProceeding || outstandingBalance > 0"
                      :class="outstandingBalance > 0 ? 'opacity-50 bg-black dark:bg-white text-white dark:text-black cursor-not-allowed' : 'bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200'"
                      class="w-full px-6 py-3 text-[13px] font-medium rounded-md transition-colors flex items-center justify-center gap-2 border border-transparent"
                    >
                      <span v-if="isProceeding" class="material-icons-round animate-spin text-[16px]">autorenew</span>
                      {{ isProceeding ? t('dashboard.assignments.verifying', 'Verifying Ledger...') : t('dashboard.assignments.proceed_btn', 'Proceed to Upload') }}
                    </button>
                  </div>
                </div>

                <div v-else class="relative p-6 bg-white dark:bg-[#0a0a0a] rounded-[calc(0.5rem-1px)] z-10 flex items-center justify-center min-h-55 w-full border border-black/10 dark:border-white/10 border-dashed">
                  <span class="text-[13px] text-[#888] dark:text-[#666]">{{ t('dashboard.assignments.idle', 'Data view idle. Please sync a structural schema.') }}</span>
                </div>
              </div>
            </div>

            <div class="bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-lg overflow-hidden w-full">
              <div class="px-6 py-4 border-b border-black/10 dark:border-white/10 bg-[#fafafa] dark:bg-[#111] flex items-center justify-between">
                <h3 class="text-[13px] font-semibold text-black dark:text-white font-sans">{{ t('dashboard.assignments.recent_activity', 'Recent Activity') }}</h3>
              </div>
              
              <div class="block md:hidden divide-y divide-black/5 dark:divide-white/5">
                <div v-if="displayedActivity.length === 0" class="p-6 text-center text-[13px] text-[#666]">
                  {{ t('dashboard.assignments.no_activity', 'No recent activity.') }}
                </div>
                <div v-for="tx in displayedActivity" :key="tx.id" class="p-4 flex flex-col gap-3" :class="{'bg-yellow-50/50 dark:bg-[#3d3300]': tx.isHighYield}">
                   <div class="flex items-start justify-between gap-3">
                     <div class="flex flex-col gap-1">
                       <span class="font-mono text-[10px] text-[#888] dark:text-[#777] leading-none">{{ tx.timestamp }}</span>
                       <span class="font-mono text-[11px] text-[#666] dark:text-[#a1a1a1] break-all whitespace-normal text-left leading-relaxed">{{ tx.reference }}</span>
                     </div>
                     <span 
                       class="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-sm border whitespace-nowrap shrink-0 mt-0.5"
                       :class="{
                         'border-emerald-200 text-emerald-600 bg-emerald-50 dark:border-emerald-900/30 dark:text-emerald-400 dark:bg-emerald-900/10': tx.status === 'Success',
                         'border-gray-200 text-gray-600 bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:bg-gray-800': tx.status === 'Corrupted',
                         'border-yellow-200 text-yellow-600 bg-yellow-50 dark:border-yellow-900/30 dark:text-yellow-400 dark:bg-yellow-900/10': tx.status === 'Pending'
                       }"
                     >
                       {{ tx.status === 'Success' ? t('dashboard.assignments.status_success', 'Success') : tx.status === 'Pending' ? t('dashboard.assignments.status_pending', 'Pending') : tx.status === 'Corrupted' ? t('dashboard.assignments.status_corrupted', 'Corrupted') : tx.status }}
                     </span>
                   </div>
                   <div class="flex items-center justify-between text-[13px] font-sans">
                     <span class="text-black dark:text-white text-left">{{ t('dashboard.assignments.asset', 'Asset') }}: {{ formatCurrency(tx.value) }}</span>
                     <div class="flex items-center gap-3">
                       <span class="text-[#666] dark:text-[#a1a1a1]">{{ tx.yieldRate === '-' ? '-' : tx.yieldRate + '%' }}</span>
                       <span class="font-medium text-black dark:text-white">{{ formatCurrency(tx.amount) }}</span>
                     </div>
                   </div>
                </div>
              </div>

              <div class="hidden md:block overflow-x-auto">
                <table class="w-full text-left border-collapse">
                  <thead class="text-[11px] uppercase tracking-wider text-[#666] dark:text-[#a1a1a1] border-b border-black/10 dark:border-white/10 font-sans bg-[#fafafa]/50 dark:bg-[#111]/50">
                    <tr>
                      <th class="px-6 py-3.5 font-semibold text-left">{{ t('dashboard.assignments.timestamp_id', 'Timestamp ID') }}</th>
                      <th class="px-6 py-3.5 font-semibold text-left w-1/4">{{ t('dashboard.assignments.reference', 'Reference') }}</th>
                      <th class="px-6 py-3.5 font-semibold text-left">{{ t('dashboard.assignments.asset_value', 'Asset Value') }}</th>
                      <th class="px-6 py-3.5 font-semibold text-left">{{ t('dashboard.assignments.yield_rate', 'Yield Rate') }}</th>
                      <th class="px-6 py-3.5 font-semibold text-left">{{ t('dashboard.assignments.yield', 'Yield') }}</th>
                      <th class="px-6 py-3.5 font-semibold text-left">{{ t('dashboard.payouts.th_status', 'Status') }}</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-black/5 dark:divide-white/5 text-[13px]">
                    <tr v-if="displayedActivity.length === 0">
                       <td colspan="6" class="px-6 py-6 text-center text-[#666] dark:text-[#a1a1a1]">{{ t('dashboard.assignments.no_activity', 'No recent activity.') }}</td>
                    </tr>
                    <tr v-for="tx in displayedActivity" :key="tx.id" class="transition-colors hover:bg-gray-50 dark:hover:bg-[#111]" :class="{'bg-yellow-50/50 dark:bg-[#3d3300]': tx.isHighYield}">
                      <td class="px-6 py-4 text-[#888] dark:text-[#666] font-mono text-[11px] whitespace-nowrap text-left align-top">{{ tx.timestamp }}</td>
                      <td class="px-6 py-4 text-[#888] dark:text-[#666] font-mono text-[11px] break-all whitespace-normal min-w-30 max-w-62.5 text-left align-top leading-relaxed">{{ tx.reference }}</td>
                      <td class="px-6 py-4 text-left text-black dark:text-white font-sans align-top">
                        {{ formatCurrency(tx.value) }}
                      </td>
                      <td class="px-6 py-4 text-left text-black dark:text-white font-sans align-top">
                        {{ tx.yieldRate === '-' ? '-' : tx.yieldRate + '%' }}
                      </td>
                      <td class="px-6 py-4 text-left text-black dark:text-white font-sans font-medium align-top">
                        {{ formatCurrency(tx.amount) }}
                      </td>
                      <td class="px-6 py-4 text-left align-top">
                        <span 
                           class="px-2 py-1 text-[10px] uppercase tracking-wider font-sans font-semibold rounded-sm border whitespace-nowrap"
                           :class="{
                             'border-emerald-200 text-emerald-600 bg-emerald-50 dark:border-emerald-900/30 dark:text-emerald-400 dark:bg-emerald-900/10': tx.status === 'Success',
                             'border-gray-200 text-gray-600 bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:bg-gray-800': tx.status === 'Corrupted',
                             'border-yellow-200 text-yellow-600 bg-yellow-50 dark:border-yellow-900/30 dark:text-yellow-400 dark:bg-yellow-900/10': tx.status === 'Pending'
                           }"
                         >
                          {{ tx.status === 'Success' ? t('dashboard.assignments.status_success', 'Success') : tx.status === 'Pending' ? t('dashboard.assignments.status_pending', 'Pending') : tx.status === 'Corrupted' ? t('dashboard.assignments.status_corrupted', 'Corrupted') : tx.status }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div v-if="recentActivity.length > 4" class="px-6 py-3 border-t border-black/5 dark:border-white/5 flex items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a]">
                <button 
                  @click="showAllActivity = !showAllActivity"
                  class="text-[13px] font-medium text-black dark:text-white hover:opacity-70 transition-opacity flex items-center gap-1.5"
                >
                  {{ showAllActivity ? t('dashboard.assignments.collapse', 'Collapse Ledger') : t('dashboard.assignments.view_all', 'View All Activity') }}
                  <span class="material-icons-round text-[16px]">{{ showAllActivity ? 'expand_less' : 'expand_more' }}</span>
                </button>
              </div>

            </div>
          </div>
        </template>

        <template v-else-if="activeTab === 'payouts'">
          <div class="max-w-5xl space-y-6">
            <h2 class="text-xl font-semibold text-black dark:text-white tracking-tight mb-4">{{ t('dashboard.payouts.title', 'Manage Payouts') }}</h2>
            
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div class="bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-lg p-6 lg:col-span-1 flex flex-col">
                <p class="text-[12px] font-medium text-[#666] dark:text-[#a1a1a1] mb-1">{{ t('dashboard.payouts.ledger_balance', 'Ledger Balance') }}</p>
                <div class="text-xl md:text-2xl font-sans font-medium text-black dark:text-white mb-6">{{ formatCurrency(displayTotalLedgerBalance) }}</div>
                
                <div class="space-y-4 flex-1">
                  
<div class="relative w-full">
  <select v-model="withdrawalForm.country" class="peer w-full p-[14px_16px] pr-10 text-[14px] rounded-md bg-transparent border outline-none z-1 focus:border-2 focus:p-[13px_15px] focus:pr-9.75 border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] cursor-pointer appearance-none">
    <option v-for="region in sortedRegions" :key="region.code" :value="region.code" class="bg-white dark:bg-[#111]">
      {{ region.label }}
    </option>
  </select>
  <label class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-white dark:bg-[#0a0a0a] px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left text-[#666] dark:text-[#a1a1a1] peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]">
    {{ t('dashboard.payouts.bank_country', 'Bank Country / Region') }}
  </label>
  <span class="material-icons-round absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#666] dark:text-[#a1a1a1] text-[18px]">expand_more</span>
</div>

<div v-if="payoutRegions[withdrawalForm.country].type === 'crypto_only'" class="space-y-4 pt-2">
  <div class="space-y-2">
    <label class="text-[13px] font-medium text-[#666] dark:text-[#a1a1a1]">{{ t('dashboard.payouts.available_methods', 'Available Payout Methods') }}</label>
    <div class="grid grid-cols-1 gap-2">
      <div class="border border-black/5 dark:border-white/5 rounded-md p-3 flex items-start gap-3 bg-[#f5f5f5] dark:bg-[#080808] cursor-not-allowed">
        <input type="radio" disabled class="mt-0.5 cursor-not-allowed">
        <div>
          <p class="text-[13px] font-medium text-[#888] dark:text-[#666]">{{ payoutRegions[withdrawalForm.country].wireLabel }}</p>
          <p class="text-[11px] text-[#aaa] dark:text-[#555] mt-0.5 leading-[1.2]">{{ t('dashboard.payouts.unavailable', 'Currently unavailable') }}</p>
        </div>
      </div>
      <div class="border border-[#0070f3] dark:border-[#3291ff] rounded-md p-3 flex items-start gap-3 bg-[#0070f3]/5 dark:bg-[#3291ff]/5">
        <input type="radio" checked readonly class="mt-0.5 accent-[#0070f3]">
        <div>
          <p class="text-[13px] font-medium text-black dark:text-white">{{ t('dashboard.payouts.tokenized', 'Tokenized Asset') }}</p>
          <p class="text-[11px] text-[#0070f3] dark:text-[#3291ff] mt-0.5 leading-[1.2]">{{ t('dashboard.payouts.manual_config', 'Manual network configuration') }}</p>
        </div>
      </div>
    </div>
  </div>

  <div class="w-full mt-4">
    <div class="relative w-full">
      <input @keydown.space.prevent v-model="withdrawalForm.token" type="text" placeholder=" " class="peer w-full p-[14px_16px] text-[14px] rounded-md bg-transparent border outline-none z-1 focus:border-2 focus:p-[13px_15px] border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20">
      <label class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-white dark:bg-[#0a0a0a] px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left transition-[top,transform,scale] duration-200 ease-in-out text-[#666] dark:text-[#a1a1a1] peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]">{{ t('dashboard.payouts.token', 'Token') }}</label>
    </div>
    <p class="text-[11px] text-[#666] dark:text-[#a1a1a1] mt-1 ml-1">{{ t('dashboard.payouts.token_placeholder', 'e.g., ETH') }}</p>
  </div>

  <div class="w-full mt-2">
    <div class="relative w-full">
      <input @keydown.space.prevent v-model="withdrawalForm.network" type="text" placeholder=" " class="peer w-full p-[14px_16px] text-[14px] rounded-md bg-transparent border outline-none z-1 focus:border-2 focus:p-[13px_15px] border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20">
      <label class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-white dark:bg-[#0a0a0a] px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left transition-[top,transform,scale] duration-200 ease-in-out text-[#666] dark:text-[#a1a1a1] peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]">{{ t('dashboard.payouts.network', 'Network') }}</label>
    </div>
    <p class="text-[11px] text-[#666] dark:text-[#a1a1a1] mt-1 ml-1">{{ t('dashboard.payouts.network_placeholder', 'e.g., ERC-20') }}</p>
  </div>

  <div class="relative w-full mt-4">
    <input @keydown.space.prevent v-model="withdrawalForm.destination" type="text" placeholder=" " class="peer w-full p-[14px_16px] text-[14px] rounded-md bg-transparent border outline-none z-1 focus:border-2 focus:p-[13px_15px] border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20">
    <label class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-white dark:bg-[#0a0a0a] px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left transition-[top,transform,scale] duration-200 ease-in-out text-[#666] dark:text-[#a1a1a1] peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]">{{ t('dashboard.payouts.wallet_address', 'Wallet Address') }}</label>
  </div>
</div>
                  <template v-else-if="payoutRegions[withdrawalForm.country].type === 'bank'">
                    <div class="pt-4 space-y-4">
                      <div v-for="field in payoutRegions[withdrawalForm.country].fields" :key="field.key" class="w-full">
                        <div class="relative w-full">
                          <input 
                            @keydown.space="['bankName', 'branchName', 'accountType'].includes(field.key) ? null : $event.preventDefault()"
                            v-model="withdrawalForm.bankDetails[field.key]" 
                            type="text" 
                            placeholder=" "
                            class="peer w-full p-[14px_16px] text-[14px] rounded-md bg-transparent border outline-none z-1 focus:border-2 focus:p-[13px_15px] border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20" 
                          >
                          <label class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-white dark:bg-[#0a0a0a] px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left transition-[top,transform,scale] duration-200 ease-in-out text-[#666] dark:text-[#a1a1a1] peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]">
                              {{ field.label }}
                          </label>
                        </div>
                        <p class="text-[11px] text-[#666] dark:text-[#a1a1a1] mt-1 ml-1">{{ field.placeholder }}</p>
                      </div>
                    </div>
                  </template>

                  <div class="mt-4 pt-4 border-t border-black/10 dark:border-white/10">
                    <div class="relative w-full">
                      <input @keydown.space.prevent v-model="withdrawalForm.amount" type="number" min="0" step="0.01" placeholder=" " class="peer w-full p-[14px_16px] text-[14px] rounded-md bg-transparent border outline-none z-1 focus:border-2 focus:p-[13px_15px] border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20">
                      <label class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-white dark:bg-[#0a0a0a] px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left transition-[top,transform,scale] duration-200 ease-in-out text-[#666] dark:text-[#a1a1a1] peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]">
                        {{ t('dashboard.payouts.amount', 'Amount') }}
                      </label>
                    </div>
                  </div>

                  <div class="relative w-full mt-4">
                    <input @keydown.space.prevent v-model="withdrawalForm.passphrase" :type="showPasswords ? 'text' : 'password'" placeholder=" " class="peer w-full p-[14px_16px] pr-12 text-[14px] rounded-md bg-transparent border outline-none z-1 focus:border-2 focus:p-[13px_15px] focus:pr-11.75 border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20">
                    <label class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-white dark:bg-[#0a0a0a] px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left transition-[top,transform,scale] duration-200 ease-in-out text-[#666] dark:text-[#a1a1a1] peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]">
                      {{ t('dashboard.payouts.passphrase', 'Payout Passphrase') }}
                    </label>
                    <button @click="showPasswords = !showPasswords" type="button" class="absolute right-4 top-0 bottom-0 my-auto flex items-center justify-center text-[#999] hover:text-[#333] dark:text-[#666] dark:hover:text-[#ccc] transition-colors z-10" tabindex="-1">
                      <span class="material-icons-round text-[20px]">{{ showPasswords ? 'visibility_off' : 'visibility' }}</span>
                    </button>
                  </div>
                </div>

                <button 
                  @click="requestPayout" 
                  :disabled="isRequestingPayout || !withdrawalForm.amount || !withdrawalForm.passphrase"
                  class="w-full mt-6 bg-black text-white dark:bg-white dark:text-black px-4 py-2.5 rounded-md text-[13px] font-medium border border-transparent disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 dark:hover:bg-gray-200 flex items-center justify-center gap-2"
                >
                  <span v-if="isRequestingPayout" class="material-icons-round animate-spin text-[16px]">autorenew</span>
                  {{ isRequestingPayout ? t('dashboard.payouts.processing', 'Processing...') : t('dashboard.payouts.withdraw_btn', 'Request Payout') }}
                </button>
              </div>

              <div class="bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-lg p-6 lg:col-span-2">
                <h3 class="text-[15px] font-semibold text-black dark:text-white mb-4">{{ t('dashboard.payouts.history_title', 'Recent Transactions') }}</h3>
                <div class="border border-black/10 dark:border-white/10 rounded-md overflow-hidden overflow-x-auto">
                  <table class="w-full min-w-125 text-left border-collapse">
                    <thead>
                      <tr class="bg-[#fafafa] dark:bg-[#111] border-b border-black/10 dark:border-white/10 text-[12px] text-[#666] dark:text-[#a1a1a1]">
                        <th class="py-2.5 px-4 font-medium">{{ t('dashboard.payouts.th_date', 'Timestamp ID') }}</th>
                        <th class="py-2.5 px-4 font-medium">{{ t('dashboard.payouts.th_method', 'Description') }}</th>
                        <th class="py-2.5 px-4 font-medium">{{ t('dashboard.payouts.th_amount', 'Amount') }}</th>
                        <th class="py-2.5 px-4 font-medium">{{ t('dashboard.payouts.th_status', 'Status') }}</th>
                      </tr>
                    </thead>
                    <tbody class="text-[13px]">
                      
                      <tr v-for="tx in payoutTransactions" :key="tx.id" class="border-b border-black/5 dark:border-white/5 hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a]">
                        <td class="py-3 px-4 text-[#666] dark:text-[#a1a1a1] whitespace-nowrap font-mono text-[11px]">{{ tx.timestamp }}</td>
                        <td class="py-3 px-4 text-black dark:text-white">{{ tx.description || t('dashboard.payouts.default_desc', 'Payout') }}</td>
                        <td class="py-3 px-4 text-black dark:text-white font-medium">-{{ formatCurrency(tx.amount) }}</td>
                        <td class="py-3 px-4">
                            <span v-if="tx.status === 'Success' || tx.status === 'Approved'" class="px-2 py-1 text-[10px] uppercase tracking-wider font-sans font-semibold rounded-sm border border-emerald-200 text-emerald-600 bg-emerald-50 dark:border-emerald-900/30 dark:text-emerald-400 dark:bg-emerald-900/10">{{ t('dashboard.payouts.status_success', 'Success') }}</span>
                            <span v-else-if="tx.status === 'Pending'" class="px-2 py-1 text-[10px] uppercase tracking-wider font-sans font-semibold rounded-sm border border-yellow-200 text-yellow-600 bg-yellow-50 dark:border-yellow-900/30 dark:text-yellow-400 dark:bg-yellow-900/10">{{ t('dashboard.payouts.status_pending', 'Pending') }}</span>
                            <span v-else-if="tx.status === 'Declined' || tx.status === 'Rejected'" class="px-2 py-1 text-[10px] uppercase tracking-wider font-sans font-semibold rounded-sm border border-red-200 text-red-600 bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:bg-red-900/10">{{ t('dashboard.payouts.status_declined', 'Declined') }}</span>
                            <span v-else class="px-2 py-1 text-[10px] uppercase tracking-wider font-sans font-semibold rounded-sm border border-gray-200 text-gray-600 bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:bg-gray-800">{{ tx.status }}</span>
                        </td>
                      </tr>
                      
                      <tr class="hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a]">
                        <td class="py-3 px-4 text-[#666] dark:text-[#a1a1a1] whitespace-nowrap font-mono text-[11px]">{{ welcomeBonusTimestamp }}</td>
                        <td class="py-3 px-4 text-black dark:text-white">{{ t('dashboard.payouts.welcome_bonus_desc', 'Welcome Bonus') }}</td>
                        <td class="py-3 px-4 text-black dark:text-white font-medium">+{{ formatCurrency(20) }}</td>
                        <td class="py-3 px-4">
                            <span class="px-2 py-1 text-[10px] uppercase tracking-wider font-sans font-semibold rounded-sm border border-emerald-200 text-emerald-600 bg-emerald-50 dark:border-emerald-900/30 dark:text-emerald-400 dark:bg-emerald-900/10">{{ t('dashboard.payouts.status_success', 'Success') }}</span>
                        </td>
                      </tr>

                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="['terms', 'privacy', 'cookies', 'legal', 'faq'].includes(activeTab as string)">
          <div class="bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-lg p-8 max-w-3xl">
            <div class="prose dark:prose-invert max-w-none text-[14px] text-[#444] dark:text-[#ccc] leading-relaxed space-y-6">
              
              <template v-if="activeTab === 'terms'">
                <h2 class="text-xl font-semibold text-black dark:text-white mb-4">{{ t('terms.tos.title') }}</h2>
                <span class="text-[#666] dark:text-[#a1a1a1] text-[0.9rem] mb-6 block">{{ t('terms.tos.last_updated') }}</span>
                <div class="w-full wrap-break-word" v-html="t('terms.tos.content')"></div>
              </template>

              <template v-else-if="activeTab === 'privacy'">
                <h2 class="text-xl font-semibold text-black dark:text-white mb-4">{{ t('terms.privacy.title') }}</h2>
                <span class="text-[#666] dark:text-[#a1a1a1] text-[0.9rem] mb-6 block">{{ t('terms.privacy.last_updated') }}</span>
                <div class="w-full wrap-break-word" v-html="t('terms.privacy.content')"></div>
              </template>

              <template v-else-if="activeTab === 'cookies'">
                <h2 class="text-xl font-semibold text-black dark:text-white mb-4">{{ t('terms.cookies.title') }}</h2>
                <span class="text-[#666] dark:text-[#a1a1a1] text-[0.9rem] mb-6 block">{{ t('terms.cookies.last_updated') }}</span>
                <div class="w-full wrap-break-word" v-html="t('terms.cookies.content')"></div>
              </template>

              <template v-else-if="activeTab === 'legal'">
                <h2 class="text-xl font-semibold text-black dark:text-white mb-4">{{ t('terms.registration.title') }}</h2>
                <div class="w-full wrap-break-word mb-10" v-html="t('terms.registration.content')"></div>

                <div v-if="backendImages.length > 0" class="mt-12 border-t border-black/10 dark:border-white/10 pt-8">
                    <div class="flex flex-wrap gap-5">
                        <a 
                          v-for="(img, index) in backendImages" 
                          :key="img.id || index" 
                          :href="img.url" 
                          target="_blank"
                          class="block w-full md:w-[calc(50%-10px)] relative group cursor-pointer" 
                        >
                            <img :src="img.url" :alt="t('terms.registration.certificate', 'Certificate')" class="w-full h-auto rounded-lg border border-black/10 dark:border-white/10" loading="lazy" />
                            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg">
                                <span class="material-icons-round text-white text-3xl drop-shadow-md">open_in_new</span>
                            </div>
                        </a>
                    </div>
                </div>
              </template>

              <template v-else-if="activeTab === 'faq'">
                <h2 class="text-xl font-semibold text-black dark:text-white mb-6">{{ ui.sidebar.faq }}</h2>
                <FaqAccordion />
              </template>

            </div>
          </div>
        </template>

      </div>

      <SuccessModal 
        :show="modalState.show" 
        :title="modalState.title" 
        :message="modalState.message" 
        :type="modalState.type" 
        :is-confirm="modalState.isConfirm"
        @close="closeModal" 
        @confirm="handleModalConfirm"
      />
    </main>
  </div>
</template>

<style scoped>
@keyframes rainbow-glow-spin {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.animate-rainbow-glow-spin {
  animation: rainbow-glow-spin 3s ease infinite;
}

.confetti {
  position: absolute;
  width: 8px;
  height: 16px;
  top: -20px;
  opacity: 0;
  animation: fall linear forwards;
  border-radius: 2px;
}

@keyframes fall {
  0% { top: -20px; opacity: 1; transform: rotate(0deg) scale(1); }
  100% { top: 100vh; opacity: 0; transform: rotate(720deg) scale(0.8); }
}
</style>
