<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useHead } from "@vueuse/head";
import { useI18n } from "vue-i18n";
import ThemeLangSwitch from "../components/ui/ThemeLangSwitch.vue";
import SuccessModal from "../components/ui/SuccessModal.vue";
import FaqAccordion from "../components/ui/FaqAccordion.vue";
import GlobalRadar from "../components/ui/GlobalRadar.vue";
import { useUserStore } from "@/store/modules/user";
import {
  getUserInfo,
  initStartDataApi,
  getGoodsApi,
  getOrderListApi,
  submitGoodsOrderApi,
  getWithdrawLogApi,
  userWithdrawApi,
  getUserChecklist,
  updHeadimgApi,
  updUserInfoApi,
  updPasswordFun,
  updPayPasswordFun,
  getConfig,
  getIndex,
  getArticle,
  readGiftMessage,
  readMessage,
  cardBindApi,
  getCardInfo,
} from "@/api";
import ImagePopup from "@/components/ImagePopup.vue";

const { t, te, locale } = useI18n();
const router = useRouter();
const userStore = useUserStore();

const modalState = ref({
  show: false,
  message: "",
  isConfirm: false,
  onConfirm: () => {},
});

const mainScrollContainer = ref<HTMLElement | null>(null);
const showGiftModal = ref(false);
const giftModalAmount = ref("");
const isSpecialBonusPending = ref(false);
const isGlobeGolden = ref(false);
const isInitialLoad = ref(true);

watch(() => showGiftModal.value, (isOpen) => {
  if (isOpen) {
    isGlobeGolden.value = true;
  }
});

watch(() => isSpecialBonusPending.value, (isPending) => {
  if (!isPending) {
    isGlobeGolden.value = false;
  }
});

const checkAndBlockForBonus = () => {
  if (isSpecialBonusPending.value) {
    showConfetti.value = true;
    showGiftModal.value = true;
    return true;
  }
  return false;
};

/** 打开全局弹窗，直接使用后端返回的 message 作为提示内容 */
const openModal = (
  message: string,
  isConfirm = false,
  onConfirm = () => {}
) => {
  modalState.value = { show: true, message, isConfirm, onConfirm };
};

const getBackendMsg = (res: { message?: any } | null | undefined) => {
  if (!res || !res.message) return t("dashboard.modal.general_error");

  const msg = String(res.message).trim();
  if (!msg) return t("dashboard.modal.general_error");

  const lowerMsg = msg.toLowerCase();

  if (lowerMsg.includes("minimum withdrawal amount is")) {
    return t("dashboard.payouts.min_withdrawal");
  }
  if (
    lowerMsg.includes("you need to complete") &&
    lowerMsg.includes("data of the current membership level")
  ) {
    return t("dashboard.payouts.action_denied_quota");
  }
  if (lowerMsg.includes('submit the pending data in the "history"')) {
    return t("dashboard.assignments.pending_schema_error");
  }
  if (lowerMsg.includes("currently uncompleted orders")) {
    return t("dashboard.payouts.action_denied_quota");
  }
  if (lowerMsg.includes("the balance is less than")) {
    return t("dashboard.assignments.unable_to_start");
  }
  if (lowerMsg.includes("withdrawal password is wrong")) {
    return t("dashboard.payouts.passphrase_error");
  }
  if (lowerMsg.includes("withdrawal application successful")) {
    return t("dashboard.payouts.request_success");
  }
  if (lowerMsg.includes("binding successful")) {
    return t("dashboard.payouts.wallet_saved");
  }
  if (lowerMsg.includes("binding failed")) {
    return t("dashboard.payouts.wallet_save_failed");
  }
  if (
    lowerMsg.includes("the wallet address has been approved by other users") ||
    lowerMsg.includes("approved by other users")
  ) {
    return t("dashboard.payouts.wallet_already_used");
  }

  const safeKey = msg
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "");
  const i18nKey = `auth.backend_errors.${safeKey}`;

  if (te(i18nKey)) {
    return t(i18nKey);
  }

  return t("dashboard.modal.general_error");
};

const closeModal = () => {
  modalState.value.show = false;
};

const handleModalConfirm = () => {
  if (modalState.value.isConfirm) {
    modalState.value.onConfirm();
  }
  closeModal();
};
watch(
  () => modalState.value.show,
  (isShowing: boolean) => {
    if (!isShowing) {
      showConfetti.value = false;
    }
  }
);

const userData = ref({
  displayName: "-",
  accountTier: "-",
  creditScore: "-",
  profilePicUrl: "",
  referralId: "",
  hasPassphrase: false,
  email: "",
  isCoachAccount: false,
  createdAt: "",
});

const isUserDataLoaded = ref(false);

const level_info = ref<any>(null);
const creditScoreDetails = computed(() => {
  const scoreStr = userData.value.creditScore;

  if (scoreStr === "-") {
    return {
      value: 0,
      text: "-",
      colorClass: "text-[#aaa] dark:text-[#555]",
      bgClass: "bg-[#f0f0f0] dark:bg-[#222]",
      barClass: "bg-[#ccc] dark:bg-[#444]",
    };
  }
    
  const score = parseFloat(scoreStr);
  const clampedScore = Math.min(Math.max(score, 0), 100);

  let colorClass = "";
  let barClass = "";
  let bgClass = "";

  if (clampedScore < 40) {
    colorClass = "text-red-600 dark:text-red-400";
    barClass = "bg-red-500";
    bgClass = "bg-red-100 dark:bg-red-900/30";
  } else if (clampedScore < 70) {
    colorClass = "text-amber-600 dark:text-amber-400";
    barClass = "bg-amber-500";
    bgClass = "bg-amber-100 dark:bg-amber-900/30";
  } else if (clampedScore < 85) {
    colorClass = "text-lime-600 dark:text-lime-400";
    barClass = "bg-lime-500";
    bgClass = "bg-lime-100 dark:bg-lime-900/30";
  } else {
    colorClass = "text-emerald-600 dark:text-emerald-400";
    barClass = "bg-emerald-500";
    bgClass = "bg-emerald-100 dark:bg-emerald-900/30";
  }

  return {
    value: clampedScore,
    text: `${clampedScore}%`,
    colorClass,
    bgClass,
    barClass,
  };
});

/** 拉取当前用户信息并更新 store 与本地 userData 展示 */
const fetchUserData = async () => {
  try {
    /** 刷新前若刚上传过头像，store/localStorage 里已是新头像，接口可能仍返回旧值，故先保留本地头像用于展示 */
    const storedAvatar =
      userStore.userInfo && typeof userStore.userInfo === "object"
        ? ((userStore.userInfo as Record<string, unknown>).avatar as
            | string
            | undefined)
        : undefined;

    const res = (await getUserInfo({})) as {
      status?: number;
      data?: Record<string, unknown>;
    };
    if (res.status !== 1 || !res.data) return;
    const d = res.data;
    const host =
      (import.meta as { env?: { VITE_INTERFACE_URL?: string } }).env
        ?.VITE_INTERFACE_URL || "";
    const apiAvatar = (d.avatar as string) || "";
    /** 优先使用本地已保存的头像（上传成功后写入），避免刷新后接口未更新时又显示旧头像 */
    const avatar =
      storedAvatar && storedAvatar.trim() ? storedAvatar : apiAvatar;
    const mergedUserInfo = { ...d, avatar } as {
      userid?: string;
      [k: string]: unknown;
    };
    userStore.setUserInfo(mergedUserInfo);

    const levelInfo = d.level_info as { name?: string } | undefined;
    level_info.value = d.level_info;
    userData.value = {
      displayName: (d.nickname as string) ?? "-",
      accountTier: (levelInfo?.name as string) ?? "-",
      creditScore: d.credit_value != null ? String(d.credit_value) : "-",
      profilePicUrl: avatar
        ? avatar.startsWith("http")
          ? avatar
          : host + avatar
        : "",
      referralId: (d.division_invite as string) ?? "",
      hasPassphrase: (d.is_pay_pwd as number) === 1,
      email: (d.email as string) ?? "",
      isCoachAccount: (d.account_type as number) === 2,
      createdAt: (d.create_time as string) ?? "",
    };
    isUserDataLoaded.value = true;

    const region = d.region as string;
    if (region) {
      passphraseForm.value.country = region;
    }
  } catch (error) {
    console.error("Failed to fetch user data:", error);
  }
};

const activeTooltip = ref<string | null>(null);
const vClickOutside = {
  mounted(el: HTMLElement, binding: any) {
    (el as any)._clickOutside = (event: Event) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value(event);
      }
    };
    document.addEventListener("click", (el as any)._clickOutside);
    document.addEventListener("touchstart", (el as any)._clickOutside, {
      passive: true,
    });
  },
  unmounted(el: HTMLElement) {
    document.removeEventListener("click", (el as any)._clickOutside);
    document.removeEventListener("touchstart", (el as any)._clickOutside);
  },
};

const savedWallet = ref({ isSaved: false, token: "", destination: "", accountName: "" });
const showPayoutErrors = ref(false);
const isSavingWallet = ref(false);

const editWalletAddress = () => {
  savedWallet.value.isSaved = false;
};

const walletAddressError = computed(() => {
  if (
    savedWallet.value.isSaved ||
    !withdrawalForm.value.destination ||
    !withdrawalForm.value.token
  ) {
    return "";
  }

  const token = withdrawalForm.value.token;
  const address = withdrawalForm.value.destination;

  if (token === "BTC") {
    if (
      !/^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{39,59})$/.test(
        address
      )
    ) {
      return t(
        "dashboard.payouts.invalid_btc",
        "Invalid Bitcoin address format."
      );
    }
  } else if (token === "ETH" || token === "USDC") {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return t(
        "dashboard.payouts.invalid_erc20",
        "Invalid ERC20 address. Must start with 0x and be 42 characters long."
      );
    }
  }
  return "";
});

const saveWalletAddress = async () => {
    if (isSavingWallet.value) return;
    
    showPayoutErrors.value = true;

    if (!withdrawalForm.value.token || !withdrawalForm.value.destination) {
      openModal(
        t(
          "dashboard.payouts.fill_required",
          "Please select a token and enter your wallet address."
        )
      );
      return;
    }

    if (!withdrawalForm.value.accountName.trim() || walletAddressError.value) {
      return;
    }

    isSavingWallet.value = true;
      try {
        const res = (await cardBindApi({
          country: withdrawalForm.value.country || "",
          coin: withdrawalForm.value.token,
          wallet_address: withdrawalForm.value.destination,
          pay_pwd: withdrawalForm.value.passphrase,
          money: withdrawalForm.value.amount,
          name: withdrawalForm.value.accountName, 
        })) as { status?: number; message?: string };

        if (res.status === 1) {
          savedWallet.value.isSaved = true;
          savedWallet.value.token = withdrawalForm.value.token;
          savedWallet.value.destination = withdrawalForm.value.destination;
          savedWallet.value.accountName = withdrawalForm.value.accountName;

          withdrawalForm.value.amount = "";
          withdrawalForm.value.passphrase = "";
          showPayoutErrors.value = false;

          openModal(
          t("dashboard.payouts.wallet_saved", "Wallet address securely saved.")
          );

          Promise.all([
            fetchUserData(),
            fetchAssignmentsState(),
            getCardInfoHandle()
          ]).catch(err => console.error("Background fetch failed:", err));

        } else {
          openModal(getBackendMsg(res));
        }
      } catch (error) {
      openModal(
        t("dashboard.modal.general_error", "An error occurred while saving.")
      );
    } finally {
      isSavingWallet.value = false;
    }
  };

  const getCardInfoHandle = async () => {
    try {
      const res: any = (await getCardInfo({})) as {
        status?: number;
        message?: string;
      };

      if (res.status === 1) {
        console.log(res, 8889);
        let d = (res.data && res.data[0]) || {};

        withdrawalForm.value.token = d.coin;
        withdrawalForm.value.destination = d.wallet_address;
        withdrawalForm.value.accountName = d.name;

      if (d.wallet_address) {
              savedWallet.value.isSaved = true;
              savedWallet.value.token = d.coin;
              savedWallet.value.destination = d.wallet_address;
              savedWallet.value.accountName = d.name;
        }
      } else {
        openModal(getBackendMsg(res));
      }
    } catch (error) {
      openModal(
        t("dashboard.modal.general_error", "An error occurred while saving.")
      );
    }
  };

const displayedDestination = computed({
  get: () => {
    const addr = withdrawalForm.value.destination;
    if (savedWallet.value.isSaved && addr && addr.length > 10) {
      return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
    }
    return addr;
  },
  set: (value: string) => {
    if (!savedWallet.value.isSaved) {
      withdrawalForm.value.destination = value;
    }
  },
});

const fileInput = ref<HTMLInputElement | null>(null);
/** 触发头像文件选择（点击隐藏的 file input） */
const triggerUpload = () => {
  if (isUploadingAvatar.value) return;
  fileInput.value?.click();
};

/** 上传头像文件并更新用户信息与头像展示（上传成功后请求 updUserInfoApi 同步头像到用户资料） */
const handleFileUpload = async (event: Event) => {
  if (isUploadingAvatar.value) return;
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  isUploadingAvatar.value = true;
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = (await updHeadimgApi(formData)) as {
      status?: number;
      data?: { url?: string };
      message?: string;
    };
    if (res.status === 1 && res.data?.url) {
      const host =
        (import.meta as { env?: { VITE_INTERFACE_URL?: string } }).env
          ?.VITE_INTERFACE_URL || "";
      const url = res.data.url;
      userData.value.profilePicUrl = url.startsWith("http") ? url : host + url;
      if (userStore.userInfo && typeof userStore.userInfo === "object") {
        (userStore.userInfo as Record<string, unknown>).avatar = url;
        userStore.setUserInfo(userStore.userInfo);
      }
      try {
        const updRes = (await updUserInfoApi({ avatar: url })) as {
          status?: number;
          message?: string;
        };
        if (updRes.status !== 1) {
          openModal(
            t(
              "dashboard.overview.avatar_fail",
              "Failed to update profile photo."
            )
          );
        } else {
          openModal(
            t("dashboard.overview.avatar_success", "Profile photo updated.")
          );
        }
      } catch (_e) {
        openModal(
          t("dashboard.overview.upload_fail", "Failed to upload image.")
        );
      }
    } else {
      openModal(
        t("dashboard.overview.avatar_fail", "Failed to update profile photo.")
      );
    }
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } };
    openModal(
      t(
        "dashboard.modal.general_error",
        "An error occurred. Please try again later."
      )
    );
  } finally {
    isUploadingAvatar.value = false;
  }
};

const welcomeBonusTimestamp = computed(() => {
  if (!userData.value.createdAt)
    return t("dashboard.overview.loading", "Loading...");

  const d = new Date(userData.value.createdAt);

  if (isNaN(d.getTime())) return userData.value.createdAt;

  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
});

/** 登出确认后清空登录态并跳转首页 */
const handleLogout = () => {
  openModal(
    t(
      "dashboard.nav.logout_confirm",
      "Are you sure you want to log out of your account?"
    ),
    true,
    () => {
      userStore.logout();
      router.push("/");
    }
  );
};

const securityForm = ref({
  oldPassword: "",
  newPassword: "",
  confirmNewPassword: "",
});
const isSavingPassword = ref(false);
const isConfiguringPassphrase = ref(false);
const isUpdatingPassphrase = ref(false);
const isUploadingAvatar = ref(false);
const passwordVisible = reactive({
  pwdOld: false,
  pwdNew: false,
  pwdConfirm: false,
  phraseSetup: false,
  phraseSetupConfirm: false,
  phraseCurrent: false,
  phraseNew: false,
  phraseConfirm: false,
  withdrawal: false,
});
/** 切换指定密码框的显示/隐藏 */
const togglePasswordVisible = (key: keyof typeof passwordVisible) => {
  passwordVisible[key] = !passwordVisible[key];
};

const newPasswordError = computed(() => {
  const pass = securityForm.value.newPassword;
  if (!pass) return "";
  if (pass.length < 6)
    return t(
      "auth.form.errors.pass_length",
      "Password must be at least 6 characters."
    );
  if (!/[a-z]/.test(pass) || !/[A-Z]/.test(pass) || !/\d/.test(pass)) {
    return t(
      "auth.form.errors.pass_complex",
      "Password must contain at least one uppercase letter, one lowercase letter, and one number."
    );
  }
  return "";
});

const confirmNewPasswordError = computed(() => {
  const confirmPass = securityForm.value.confirmNewPassword;
  if (!confirmPass) return "";
  return confirmPass === securityForm.value.newPassword
    ? ""
    : t("auth.form.errors.pass_match", "Passwords do not match.");
});

/** 提交修改登录密码并提示结果 */
const savePassword = async () => {
  if (isSavingPassword.value) return;
  if (newPasswordError.value || confirmNewPasswordError.value) return;

  isSavingPassword.value = true;
  try {
    const res = (await updPasswordFun({
      password: securityForm.value.oldPassword,
      new_password: securityForm.value.newPassword,
    })) as { status?: number; message?: string };
    if (res.status === 1) {
      openModal(
        t(
          "dashboard.overview.pass_update_success",
          "Password updated successfully."
        )
      );
      securityForm.value = {
        oldPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      };
    } else {
      openModal(
        t("dashboard.overview.pass_update_fail", "Failed to update password.")
      );
    }
  } catch (error: unknown) {
    console.error(error);
    const err = error as { response?: { data?: { message?: string } } };
    openModal(
      t(
        "dashboard.modal.general_error",
        "An error occurred. Please try again later."
      )
    );
  } finally {
    isSavingPassword.value = false;
  }
};

const passphraseForm = ref({
  currentPassphrase: "",
  passphrase: "",
  confirmPassphrase: "",
  country: "",
});

const newPassphraseError = computed(() => {
  const pass = passphraseForm.value.passphrase;
  if (!pass) return "";
//  if (pass.length < 6)
//    return t(
//      "dashboard.overview.passphrase_length",
//      "Passphrase must be at least 6 characters."
//    );
  return "";
});

const confirmPassphraseError = computed(() => {
  const confirmPass = passphraseForm.value.confirmPassphrase;
  if (!confirmPass) return "";
  return confirmPass === passphraseForm.value.passphrase
    ? ""
    : t("dashboard.overview.passphrase_match", "Passphrases do not match.");
});

const isSetupValid = computed(() => {
  return (
    passphraseForm.value.passphrase.length >= 0 &&
    passphraseForm.value.passphrase === passphraseForm.value.confirmPassphrase
  );
});

const isUpdateValid = computed(() => {
  return (
    passphraseForm.value.currentPassphrase.length > 0 &&
    passphraseForm.value.passphrase.length >= 0 &&
    passphraseForm.value.passphrase === passphraseForm.value.confirmPassphrase
  );
});

const configurePassphrase = async () => {
  if (isConfiguringPassphrase.value) return;
  if (!isSetupValid.value) return;

  isConfiguringPassphrase.value = true;
  try {
    const res = (await updPayPasswordFun({
      password: "",
      new_password: passphraseForm.value.passphrase,
    })) as { status?: number; message?: string };

    if (res.status === 1) {
      openModal(
        t("dashboard.overview.setup_success", "Passphrase securely configured.")
      );
      userData.value.hasPassphrase = true;
      showSetupPassphraseModal.value = false;
      passphraseForm.value = {
        currentPassphrase: "",
        passphrase: "",
        confirmPassphrase: "",
		country:""
      };
    } else {
      openModal(
        t("dashboard.overview.setup_fail", "Failed to configure passphrase.")
      );
    }
  } catch (error: unknown) {
    console.error(error);
    const err = error as { response?: { data?: { message?: string } } };
    openModal(
      t(
        "dashboard.modal.general_error",
        "An error occurred. Please try again later."
      )
    );
  } finally {
    isConfiguringPassphrase.value = false;
  }
};

const updatePassphrase = async () => {
  if (isUpdatingPassphrase.value) return;
  if (!isUpdateValid.value) return;

  isUpdatingPassphrase.value = true;
  try {
    const res = (await updPayPasswordFun({
      password: passphraseForm.value.currentPassphrase,
      new_password: passphraseForm.value.passphrase,
    })) as { status?: number; message?: string };
    if (res.status === 1) {
      openModal(
        t(
          "dashboard.overview.update_success",
          "Passphrase successfully updated."
        )
      );
      passphraseForm.value = {
        currentPassphrase: "",
        passphrase: "",
        confirmPassphrase: "",
		country:"",
      };
    } else {
      openModal(
        t("dashboard.overview.update_fail", "Incorrect old passphrase.")
      );
    }
  } catch (error: unknown) {
    console.error(error);
    const err = error as { response?: { data?: { message?: string } } };
    openModal(
      t(
        "dashboard.modal.general_error",
        "An error occurred. Please try again later."
      )
    );
  } finally {
    isUpdatingPassphrase.value = false;
  }
};

const copySuccess = ref(false);
/** 复制推荐 ID 到剪贴板并显示成功状态 */
const copyReferralId = async () => {
  try {
    await navigator.clipboard.writeText(userData.value.referralId);
    copySuccess.value = true;
    setTimeout(() => {
      copySuccess.value = false;
    }, 2000);
  } catch (err) {}
};

const coreLedgerBalance = ref(0.0);
const specialBonusBalance = ref(0.0);
const currentCycleProfit = ref(0.0);

const lockedInPackage = ref(0.0);
const lockedInCurrent = ref(0.0);

const frozen_amount = ref(0.0);
const now_money = ref(0.0);
const reward_rate = ref("0");
const expected_total_amount = ref(0.0);

const displayTotalLedgerBalance = computed(() => {
  return coreLedgerBalance.value;
});

const grandTotalBalance = computed(() => {
  return coreLedgerBalance.value + specialBonusBalance.value;
});

const outstandingBalance = computed(() => {
  return frozen_amount.value;
});

const displayCurrentBalance = computed(() => {
  return expected_total_amount.value;
});

const schemaQuota = ref(40);
const maxSchemaQuota = ref(40);
const currentSchema = ref<any>(null);

const activePackage = ref({
  isActive: false,
  id: "",
  size: 0,
  currentIndex: 0,
  accumulatedYield: 0,
});
const showConfetti = ref(false);
const recentActivity = ref<any[]>([]);

const showAllActivity = ref(false);
const displayedActivity = computed(() =>
  showAllActivity.value
    ? recentActivity.value
    : recentActivity.value.slice(0, 4)
);

/** 仪表盘展示用利率：优先取 level_info.reward_rate，否则用当前任务的 yieldRate */
const displayYieldRate = computed(() => {
  const levelInfo = (userStore.userInfo as Record<string, unknown> | null)
    ?.level_info as { reward_rate?: number | string } | undefined;
  if (
    levelInfo != null &&
    levelInfo.reward_rate != null &&
    levelInfo.reward_rate !== ""
  )
    return String(levelInfo.reward_rate);
  return currentSchema.value?.yieldRate ?? "-";
});

/** 将数字格式化为货币显示（两位小数、千分位） */
const formatCurrency = (value: number | string) => {
  if (value === "-") return "-";

  const intlLocale = String(locale.value).replace("_", "-");

  const formattedNumber = new Intl.NumberFormat(intlLocale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));

  return t("dashboard.currency_format", { amount: formattedNumber });
};

/** 返回随机彩纸飘落动画的样式（用于庆祝等） */
const getConfettiStyle = () => {
  const colors = [
    "#fce18a",
    "#ff726d",
    "#b48def",
    "#f4306d",
    "#42a5f5",
    "#66bb6a",
  ];
  const bg = colors[Math.floor(Math.random() * colors.length)];
  const left = Math.random() * 100 + "%";
  const animDuration = Math.random() * 2 + 3 + "s";
  const animDelay = Math.random() * 1 + "s";
  return `background-color: ${bg}; left: ${left}; animation-duration: ${animDuration}; animation-delay: ${animDelay};`;
};

const isRetrievingAssignment = ref(false);
const isProceeding = ref(false);
/** 连单自动拉下一单时沿用上一单的利率展示（与连单时利率一致） */
const liandanYieldRateForNext = ref<string | null>(null);

  const assignmentBannerText = ref('');
  const payoutBannerText = ref('');
/** 拉取任务/作业状态并更新 currentSchema、recentActivity 等 */
const fetchAssignmentsState = async () => {
  try {
    const res = (await initStartDataApi({})) as {
      status?: number;
      data?: Record<string, unknown>;
    };
    if (res.status !== 1 || !res.data) return;

    const d = res.data;

    assignmentBannerText.value = (d.assignment_banner_msg as string) || "";
    payoutBannerText.value = (d.payout_banner_msg as string) || "";

    const levelInfo = d.level_info as { task_num?: number } | undefined;

    coreLedgerBalance.value = Number(d.total_amount ?? 0);
    specialBonusBalance.value = Number(d.special_bonus ?? 0);
    frozen_amount.value = Number(d.debt ?? 0);
    expected_total_amount.value = Number(d.expected_total_amount ?? 0);
    currentCycleProfit.value = Number(d.task_force_income ?? 0);
    reward_rate.value = String(d.reward_rate ?? "0");
    now_money.value = Number(d.now_money ?? 0);

    const orderPrize = d.order_prize as
      | { prize_amount?: number | string }
      | undefined;
    const prizeAmount = Number(orderPrize?.prize_amount ?? 0);
    const localeStr = String(locale.value).replace("_", "-");

    giftModalAmount.value = `$${prizeAmount.toLocaleString(localeStr, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    isSpecialBonusPending.value = !Boolean(d.is_can_start_task);

    if (d.gift_message_count) {
      showConfetti.value = true;

      openModal(
        t("dashboard.modal.funds_received_msg", {
          amount: `$${Number(d.last_bonus ?? 0).toLocaleString(
            String(locale.value).replace("_", "-"),
            { minimumFractionDigits: 2, maximumFractionDigits: 2 }
          )}`,
        })
      );
      await readMessageFun();
    }

    maxSchemaQuota.value = levelInfo?.task_num ?? 40;
    const finishedTasks = typeof d.task_finish === "number" ? d.task_finish : 0;
    schemaQuota.value = Math.max(0, maxSchemaQuota.value - finishedTasks);

    if (userStore.userInfo && typeof userStore.userInfo === "object") {
      userStore.setUserInfo({
        ...userStore.userInfo,
        ...d,
      } as { userid?: string; [k: string]: unknown });
    }
  } catch (error) {
    console.error("Failed to fetch assignments state:", error);
  } finally {
    if (isInitialLoad.value) {
      isInitialLoad.value = false;
    }
  }
};

const readGiftMessageFun = async () => {
  try {
    const res = (await readGiftMessage({})) as { status?: number };
    console.log(999, "已触发奖金接口");
    if (res.status !== 1) return;
  } catch (error) {
    console.error("Failed to fetch records:", error);
  }
};

const readMessageFun = async () => {
  try {
    const res = (await readMessage({})) as { status?: number };
    console.log(888888);
    if (res.status !== 1) return;
  } catch (error) {
    console.error("Failed to fetch records:", error);
  }
};

const globalRadarStatus = computed(() => {
  if (isRetrievingAssignment.value || isProceeding.value || submittingRecordId.value) {
    return 'Syncing'; 
  }
  
  const hasPendingLedger = recentActivity.value.some((tx: any) => tx.statusCode === 0);
  if (hasPendingLedger) {
    return 'Pending';
  }
  
  if (currentSchema.value) {
    return 'Pending'; 
  }

  if (recentActivity.value.length > 0 && recentActivity.value[0].status === 'Success') {
    return 'Success';
  }

  return 'Idle';
});

/** 任务记录中提交某条未完成订单时使用的 loading 状态（仅订单状态为 0/Pending 可提交） */
const submittingRecordId = ref<string | null>(null);

/** 任务记录：进入页面即请求，拉取订单列表并填充 recentActivity */
const fetchTaskRecords = async () => {
  try {
    const res = (await getOrderListApi({ page: 1, limit: 50 })) as {
      status?: number;
      data?: { data?: Record<string, unknown>[] };
    };
    if (res.status !== 1 || !res.data?.data || !Array.isArray(res.data.data))
      return;
    const list = res.data.data;
    recentActivity.value = list.map(
      (item: Record<string, unknown>, i: number) => {
        const orderId = String(item.order_id ?? item.id ?? i);
        const price = Number(item.price) ?? 0;
        const income = Number(item.income) ?? 0;
        const rate =
          item.rate != null && item.rate !== ""
            ? String(item.rate)
            : price > 0
            ? ((income / price) * 100).toFixed(2)
            : "-";
        const statusCode = Number(item.status);
        const status =
          statusCode === 1
            ? "Success"
            : statusCode === 0
            ? "Pending"
            : statusCode === 2
            ? "Pending"
            : "Declined";
        return {
          id: orderId,
          txId: orderId,
          timestamp: String(item.create_time ?? item.timestamp ?? ""),
          reference: String(item.title ?? item.reference ?? "-"),
          value: price,
          yieldRate: rate,
          amount: income,
          status,
          statusCode,
          liandan_status: Number(item.liandan_status) ?? 0,
          isHighYield: (item.liandan_status as number) >= 1,
        };
      }
    );

    const pendingOrder = recentActivity.value.find(
      (tx: any) => tx.statusCode === 0
    );
    if (pendingOrder && !currentSchema.value) {
    }
  } catch (error) {
    console.error("Failed to fetch task records:", error);
  }
};

/** 从任务记录中提交未完成订单 */
const submitOrderFromRecord = async (tx: {
  txId: string;
  status: string;
  isHighYield?: boolean;
  yieldRate?: string;
  liandan_status?: number;
}) => {
  if (tx.status !== "Pending") return;
  if (submittingRecordId.value) return;
  submittingRecordId.value = tx.txId;
  try {
    const res = (await submitGoodsOrderApi({
      order_id: tx.txId,
      comment: "",
    })) as {
      status?: number;
      message?: string;
      data?: {
        is_message?: number;
        prize?: {
          prize_amount?: number | string;
        } | null;
      };
    };
    if (res.status === 1) {
      // if (res.data?.is_message === 1) {
      //   isSpecialBonusPending.value = true;

      //   const prizeAmount = Number(res.data?.prize?.prize_amount ?? 0);

      //   giftModalAmount.value = `$${prizeAmount.toLocaleString(
      //     String(locale.value).replace('_', '-'),
      //     {
      //       minimumFractionDigits: 2,
      //       maximumFractionDigits: 2,
      //     }
      //   )}`;

      //   showConfetti.value = true;
      //   showGiftModal.value = true;

      //   await readGiftMessageFun();
      //   return;
      // }

      const idx = recentActivity.value.findIndex(
        (r: { txId?: string }) => r.txId === tx.txId
      );
      if (idx !== -1)
        (recentActivity.value[idx] as { status?: string }).status = "Success";

      console.log(555, tx.liandan_status);
      await fetchAssignmentsState();
      await fetchTaskRecords();
      currentSchema.value = null;
      if (tx.isHighYield && tx.yieldRate && tx.liandan_status === 1) {
        liandanYieldRateForNext.value = tx.yieldRate;
        await retrieveAssignment();
      }
    } else {
      openModal(t("dashboard.assignments.upload_error", "Unable to upload."));
    }
  } catch (error: unknown) {
    openModal(
      t(
        "dashboard.modal.general_error",
        "An error occurred. Please try again later."
      )
    );
  } finally {
    submittingRecordId.value = null;
  }
};

/** 领取/刷新当前任务 */
const retrieveAssignment = async (
  _forcedType: "auto" | "auto-package" = "auto"
) => {
  if (isRetrievingAssignment.value) return;

  if (now_money.value < 0) {
    openModal(
      t(
        "dashboard.assignments.pending_schema_error",
        "Please complete the pending product before continuing to the next."
      )
    );
    return;
  }

  const hasPendingInList = recentActivity.value.some(
    (tx: any) => tx.statusCode === 0
  );

  if (currentSchema.value || hasPendingInList) {
    openModal(
      t(
        "dashboard.assignments.pending_schema_error",
        "Please complete the pending product before continuing to the next."
      )
    );
    return;
  }

  if (checkAndBlockForBonus()) return;

  if (schemaQuota.value <= 0) {
    openModal(
      t("dashboard.assignments.sync_error", "The cycle has been completed.")
    );
    return;
  }

  isRetrievingAssignment.value = true;
  try {
    const res = (await getGoodsApi({})) as {
      status?: number;
      data?: Record<string, unknown>;
      message?: string;
    };
    if (res.status !== 1 || !res.data) {
      openModal(
        getBackendMsg(res) ||
          t("dashboard.assignments.sync_error", "The cycle has been completed.")
      );
      return;
    }

    const d = res.data as any;

    if (Number(d?.prize_info?.is_message) === 1) {
      console.log(1111111, d);
      isSpecialBonusPending.value = true;

      const prizeAmount = Number(d?.prize_info?.prize?.prize_amount ?? 0);
      const localeStr = String(locale.value).replace("_", "-");

      giftModalAmount.value = `$${prizeAmount.toLocaleString(localeStr, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

      showConfetti.value = true;
      showGiftModal.value = true;

      await readGiftMessageFun();
      return;
    }

    const host =
      (import.meta as { env?: { VITE_INTERFACE_URL?: string } }).env
        ?.VITE_INTERFACE_URL || "";
    const imgUrl = d.img
      ? String(d.img).startsWith("http")
        ? d.img
        : host + d.img
      : "";
    const yieldRateToUse =
      liandanYieldRateForNext.value != null
        ? liandanYieldRateForNext.value
        : d.rate != null
        ? String(d.rate)
        : "-";
    if (liandanYieldRateForNext.value != null)
      liandanYieldRateForNext.value = null;

    await fetchAssignmentsState();
    currentSchema.value = {
      txId: d.order_id as string,
      value: Number(d.price) ?? 0,
      yieldImpact: Number(d.income) ?? 0,
      yieldRate: yieldRateToUse,
      isHighYield: (d.liandan_status as number) >= 1,
      liandan_status: (d.liandan_status as number) === 1,
      isCorrupted: false,
      img: imgUrl,
      image: imgUrl,
      timestamp: (d.create_time as string) ?? "",
      reference: (d.title as string) ?? "",
    };
    lockedInCurrent.value = currentSchema.value.value;
    await fetchTaskRecords();
  } catch (error: unknown) {
    openModal(
      t(
        "dashboard.modal.general_error",
        "An error occurred. Please try again later."
      )
    );
  } finally {
    isRetrievingAssignment.value = false;
  }
};

/** 进入下一阶段/下一步流程并刷新状态 */
const proceedToNext = async () => {
  if (isProceeding.value) return;
  if (displayCurrentBalance.value < 0) {
    openModal(
      t("dashboard.assignments.upload_outstanding_error", "Unable to upload.")
    );
    return;
  }
  if (!currentSchema.value) return;

  isProceeding.value = true;
  try {
    const res = (await submitGoodsOrderApi({
      order_id: currentSchema.value.txId,
      comment: "",
    })) as {
      status?: number;
      message?: string;
      data?: {
        is_message?: number;
        prize?: {
          prize_amount?: number | string;
        } | null;
      };
    };
    if (res.status === 1) {
      // if (res.data?.is_message === 1) {
      //   isSpecialBonusPending.value = true;

      //   const prizeAmount = Number(res.data?.prize?.prize_amount ?? 0);
      //   const localeStr = String(locale.value).replace('_', '-');

      //   giftModalAmount.value = `$${prizeAmount.toLocaleString(localeStr, {
      //     minimumFractionDigits: 2,
      //     maximumFractionDigits: 2,
      //   })}`;

      //   showConfetti.value = true;
      //   showGiftModal.value = true;

      //   await readGiftMessageFun();
      //   return;
      // }

      const schema = currentSchema.value;
      const isLiandan = schema?.liandan_status === true;
      if (isLiandan && schema?.yieldRate)
        liandanYieldRateForNext.value = schema.yieldRate;
      // schemaQuota.value = Math.max(0, schemaQuota.value - 1)
      const txIndex = recentActivity.value.findIndex(
        (tx: { txId?: string }) => tx.txId === schema.txId
      );

      lockedInCurrent.value = 0;
      currentSchema.value = null;
      await fetchAssignmentsState();
      await fetchTaskRecords();
      if (isLiandan) await retrieveAssignment();
    } else {
      openModal(t("dashboard.assignments.upload_error", "Unable to upload."));
    }
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } };
    openModal(
      t(
        "dashboard.modal.general_error",
        "An error occurred. Please try again later."
      )
    );
  } finally {
    isProceeding.value = false;
  }
};

const payoutRegions = computed<
  Record<
    string,
    {
      label: string;
      type: "crypto_only" | "bank";
      wireLabel?: string;
      fields?: { key: string; label: string; placeholder: string }[];
    }
  >
>(() => ({
  US: {
    label: t("dashboard.regions.us", "United States"),
    type: "crypto_only",
    wireLabel: t("dashboard.regions.wire_us", "Wire Transfer / ACH"),
  },
  UK: {
    label: t("dashboard.regions.uk", "United Kingdom"),
    type: "crypto_only",
    wireLabel: t("dashboard.regions.wire_uk", "BACS / Wire Transfer"),
  },
  CA: {
    label: t("dashboard.regions.ca", "Canada"),
    type: "crypto_only",
    wireLabel: t("dashboard.regions.wire_ca", "Interac / Wire Transfer"),
  },
  EU: {
    label: t("dashboard.regions.eu", "Europe (Eurozone)"),
    type: "crypto_only",
    wireLabel: t("dashboard.regions.wire_eu", "SEPA Transfer"),
  },
  ES: {
    label: t("dashboard.regions.es", "Spain"),
    type: "crypto_only",
    wireLabel: t("dashboard.regions.wire_eu", "SEPA Transfer"),
  },
  HK: {
    label: t("dashboard.regions.hk", "Hong Kong"),
    type: "bank",
    fields: [
      {
        key: "bankName",
        label: t("dashboard.regions.bank_name", "Bank Name"),
        placeholder: t(
          "dashboard.regions.placeholder_hsbc",
          "e.g., HSBC, Hang Seng"
        ),
      },
      {
        key: "bankCode",
        label: t("dashboard.regions.bank_code", "Bank Code"),
        placeholder: t("dashboard.regions.placeholder_3digit", "3-digit code"),
      },
      {
        key: "branchCode",
        label: t("dashboard.regions.branch_code", "Branch Code"),
        placeholder: t("dashboard.regions.placeholder_3digit", "3-digit code"),
      },
      {
        key: "account",
        label: t("dashboard.regions.account_num", "Account Number"),
        placeholder: t(
          "dashboard.regions.placeholder_account",
          "Enter account number"
        ),
      },
    ],
  },
  JP: {
    label: t("dashboard.regions.jp", "Japan"),
    type: "bank",
    fields: [
      {
        key: "bankName",
        label: t("dashboard.regions.bank_name_jp", "Bank Name (銀行名)"),
        placeholder: t(
          "dashboard.regions.placeholder_mufg",
          "e.g., Mitsubishi UFJ"
        ),
      },
      {
        key: "branchCode",
        label: t(
          "dashboard.regions.branch_code_jp",
          "Branch Code (支店コード)"
        ),
        placeholder: t("dashboard.regions.placeholder_3digit", "3-digit code"),
      },
      {
        key: "accountType",
        label: t(
          "dashboard.regions.account_type_jp",
          "Account Type (口座種別)"
        ),
        placeholder: t(
          "dashboard.regions.placeholder_futsu",
          "e.g., Futsu (Ordinary)"
        ),
      },
      {
        key: "account",
        label: t(
          "dashboard.regions.account_num_jp",
          "Account Number (口座番号)"
        ),
        placeholder: t(
          "dashboard.regions.placeholder_7digit",
          "7-digit number"
        ),
      },
    ],
  },
  KR: {
    label: t("dashboard.regions.kr", "South Korea"),
    type: "bank",
    fields: [
      {
        key: "bankCode",
        label: t("dashboard.regions.bank_code", "Bank Code"),
        placeholder: t(
          "dashboard.regions.placeholder_3digit",
          "3-digit bank code"
        ),
      },
      {
        key: "account",
        label: t("dashboard.regions.account_num", "Account Number"),
        placeholder: t(
          "dashboard.regions.placeholder_nodash",
          "Enter without dashes"
        ),
      },
    ],
  },
  SG: {
    label: t("dashboard.regions.sg", "Singapore"),
    type: "bank",
    fields: [
      {
        key: "bankName",
        label: t("dashboard.regions.bank_name", "Bank Name"),
        placeholder: t(
          "dashboard.regions.placeholder_dbs",
          "e.g., DBS, UOB, OCBC"
        ),
      },
      {
        key: "bankCode",
        label: t("dashboard.regions.bank_code", "Bank Code"),
        placeholder: t("dashboard.regions.placeholder_4digit", "4-digit code"),
      },
      {
        key: "branchCode",
        label: t("dashboard.regions.branch_code", "Branch Code"),
        placeholder: t("dashboard.regions.placeholder_3digit", "3-digit code"),
      },
      {
        key: "account",
        label: t("dashboard.regions.account_num", "Account Number"),
        placeholder: t(
          "dashboard.regions.placeholder_account",
          "Enter account number"
        ),
      },
    ],
  },
  TH: {
    label: t("dashboard.regions.th", "Thailand"),
    type: "bank",
    fields: [
      {
        key: "bankName",
        label: t("dashboard.regions.bank_name", "Bank Name"),
        placeholder: t(
          "dashboard.regions.placeholder_kasikorn",
          "e.g., Kasikorn, SCB, Bangkok Bank"
        ),
      },
      {
        key: "account",
        label: t("dashboard.regions.account_num", "Account Number"),
        placeholder: t(
          "dashboard.regions.placeholder_account",
          "Enter account number"
        ),
      },
    ],
  },
}));

const sortedRegions = computed(() => {
  return Object.entries(payoutRegions.value)
    .map(([code, config]) => ({ code, ...config }))
    .sort((a, b) => a.label.localeCompare(b.label));
});

const withdrawalForm = ref({
  country: "US",
  token: "",
  destination: "",
  accountName: "",
  bankDetails: {} as Record<string, string>,
  amount: "",
  passphrase: "",
  network: "",
});

const isCountryDropdownOpen = ref(false);
const isTokenDropdownOpen = ref(false);

const cryptoOptions = [
  {
    value: "BTC",
    name: "Bitcoin",
    networkText: "BTC",
    icon: "/images/Bitcoin (BTC).webp",
  },
  {
    value: "ETH",
    name: "Ethereum",
    networkText: "ERC20",
    icon: "/images/Ethereum (ERC20).webp",
  },
  {
    value: "USDC",
    name: "USDC",
    networkText: "ERC20",
    icon: "/images/USDC (ERC20).webp",
  },
];

const selectedTokenDetails = computed(() =>
  cryptoOptions.find((t) => t.value === withdrawalForm.value.token)
);

/** 提现金额输入：仅允许数字与一个小数点，小数点后最多两位 */
const handleAmountInput = (e: Event) => {
  const el = e.target as HTMLInputElement;
  let raw = el.value.replace(/[^\d.]/g, "");
  const parts = raw.split(".");
  if (parts.length > 2) raw = parts[0] + "." + parts.slice(1).join("");
  else if (parts.length === 2) raw = parts[0] + "." + parts[1].slice(0, 2);
  if (el.value !== raw) el.value = raw;
  withdrawalForm.value.amount = raw;
};

watch(
  () => withdrawalForm.value.country,
  (newCountry: string) => {
    const regionType = payoutRegions.value[newCountry]?.type;

    withdrawalForm.value.bankDetails = {};
    withdrawalForm.value.network = "";

    if (regionType === "crypto_only" && savedWallet.value.isSaved) {
      withdrawalForm.value.token = savedWallet.value.token;
      withdrawalForm.value.destination = savedWallet.value.destination;
      withdrawalForm.value.accountName = savedWallet.value.accountName;
    }
  }
);

const payoutTransactions = ref<any[]>([]);
const isRequestingPayout = ref(false);

// HELPER: Checks if the destination is set up so we can unlock Card 3
const isDestinationReady = computed(() => {
  const regionType = payoutRegions.value[withdrawalForm.value.country]?.type;
  if (regionType === 'crypto_only') {
    return savedWallet.value.isSaved; // Crypto needs the address saved first
  } else {
    // Bank details don't have a "save" button step in your current flow, so it's always ready
    return true; 
  }
});

/** 将提现状态码映射为展示文案（成功/拒绝/待处理） */
const mapWithdrawStatus = (status: number) => {
  if (status === 1) return "Success";
  if (status === 0) return "Pending";
  if (status === -1) return "Rejected";
  return "Pending";
};

/** 拉取提现记录列表 */
const fetchPayoutHistory = async () => {
  try {
    const res = (await getWithdrawLogApi({ pageNow: 1, pageSize: 50 })) as {
      status?: number;
      data?: { data?: Record<string, unknown>[] };
    };
    if (res.status !== 1 || !res.data?.data || !Array.isArray(res.data.data)) {
      payoutTransactions.value = [];
      return;
    }
    payoutTransactions.value = res.data.data.map(
      (item: Record<string, unknown>, index: number) => ({
        id: item.create_time ?? index,
        timestamp: (item.create_time as string) ?? "",
        description: t("dashboard.payouts.default_desc", "Payout"),
        amount: Number(item.really_money) ?? 0,
        status: mapWithdrawStatus(item.status as number),
      })
    );
  } catch (error) {
    console.error("Failed to fetch payout history:", error);
  }
};

const requestPayout = async () => {
  if (isRequestingPayout.value) return;
  showPayoutErrors.value = true;
  if (!withdrawalForm.value.accountName.trim()) return;

  const currentRegion = payoutRegions.value[withdrawalForm.value.country];

  if (!withdrawalForm.value.amount || !withdrawalForm.value.passphrase) {
    openModal(t("dashboard.payouts.fill_required", "Please fill out all required fields to request a payout."));
    return;
  }

    const amountToWithdraw = parseFloat(withdrawalForm.value.amount);

    if (amountToWithdraw > grandTotalBalance.value) {
      const errorMessage = specialBonusBalance.value > 0 
        ? t("dashboard.payouts.exceeds_grand_total", "Requested amount exceeds your available grand total.") 
        : t("dashboard.payouts.exceeds_balance", "Requested amount exceeds your available ledger balance.");
        
      openModal(errorMessage);
      return;
    }

  let dest = "";
  let methodStr = "";
  let methodIcon = "";

  if (currentRegion.type === "crypto_only") {
    const { token, destination } = withdrawalForm.value;

    if (!token || !destination) {
      openModal(t("dashboard.payouts.crypto_required", "Please fill out token and wallet address for tokenized asset payouts."));
      return;
    }
    
    dest = destination;

    if (selectedTokenDetails.value) {
          methodStr = `${selectedTokenDetails.value.name} (${selectedTokenDetails.value.networkText})`;
          methodIcon = selectedTokenDetails.value.icon;
        } else {
          methodStr = token;
    }

  } else if (currentRegion.type === "bank") {
    const missingFields: string[] = [];

    currentRegion.fields?.forEach((field: { key: string; label: string; placeholder: string }) => {
      const value = withdrawalForm.value.bankDetails?.[field.key];
      if (!value) missingFields.push(field.label);
    });

    if (missingFields.length > 0) {
      openModal(t("dashboard.payouts.bank_required", "Please fill out all required bank account fields before requesting a payout."));
      return;
    }
    
    dest = withdrawalForm.value.bankDetails["account"];
    const bankName = withdrawalForm.value.bankDetails["bankName"];
    methodStr = bankName ? `${bankName} Transfer` : `${currentRegion.label} Bank Transfer`;
  }

  let maskedDest = dest;
  if (currentRegion.type === "crypto_only" && dest && dest.length > 10) {
    maskedDest = `${dest.substring(0, 6)}...${dest.substring(dest.length - 4)}`;
  }

  payoutCountdown.value = 3;
  payoutConfirmModal.value = {
    show: true,
    amount: withdrawalForm.value.amount,
    destination: maskedDest,
    method: methodStr,
    accountName: withdrawalForm.value.accountName,
    icon: methodIcon,
  };

  if (payoutTimerId) clearInterval(payoutTimerId);
  payoutTimerId = setInterval(() => {
    if (payoutCountdown.value > 0) {
      payoutCountdown.value--;
    } else {
      clearInterval(payoutTimerId as ReturnType<typeof setInterval>);
      payoutTimerId = null;
    }
  }, 1000);
};

const executePayout = async () => {
  payoutConfirmModal.value.show = false;
  isRequestingPayout.value = true;

  const amountToWithdraw = parseFloat(withdrawalForm.value.amount);
  const currentRegion = payoutRegions.value[withdrawalForm.value.country];
  const countryLabel = currentRegion?.label || "";

  try {
    let formattedCoin = withdrawalForm.value.token;
    if (selectedTokenDetails.value) {
      formattedCoin = `${selectedTokenDetails.value.name} (${selectedTokenDetails.value.networkText})`;
    }

    const res = (await userWithdrawApi({
      country: countryLabel,
      coin: formattedCoin,
      wallet_address: withdrawalForm.value.destination,
      bank_name: withdrawalForm.value.bankDetails["bankName"],
      bank_code: withdrawalForm.value.bankDetails["account"],
      sub_bank_name: withdrawalForm.value.bankDetails["branchCode"],
      pay_pwd: withdrawalForm.value.passphrase,
      money: amountToWithdraw,
      name: payoutConfirmModal.value.accountName, 
    })) as { status?: number; message?: string };

    if (res.status === 1) {
      openModal(getBackendMsg(res));
      withdrawalForm.value.amount = "";
      withdrawalForm.value.passphrase = "";
      await fetchUserData();
      await fetchAssignmentsState();
      await fetchPayoutHistory();
    } else {
      openModal(getBackendMsg(res));
    }
  } catch (error: unknown) {
    console.error(error);
    const err = error as { response?: { data?: { message?: string } } };
    openModal(getBackendMsg(err?.response?.data));
  } finally {
    isRequestingPayout.value = false;
  }
};

const currentDate = new Date();
const currentYearUTC = currentDate.getUTCFullYear();
const currentMonthUTC = currentDate.getUTCMonth();
const daysInCurrentMonth = new Date(
  Date.UTC(currentYearUTC, currentMonthUTC + 1, 0)
).getUTCDate();

const currentMonthName = computed(() => {
  return new Intl.DateTimeFormat(locale.value, {
    month: "long",
    timeZone: "UTC",
  }).format(currentDate);
});

/** 模拟签到后的数据：连续签到天数与今日签到时间，用于展示签到成功效果 */
const MOCK_AFTER_SIGN = { currentStreak: 12, todaySignTime: "09:15:32" };

const attendance = ref({
  currentStreak: 0,
  totalDays: daysInCurrentMonth,
  payoutMilestones: [4, 14, daysInCurrentMonth],
  /** 是否已展示为「签到后」状态（今日已签到） */
  todaySigned: false,
  /** 今日签到时间，用于签到成功展示 */
  todaySignTime: "",
});

/** 拉取签到与考勤数据；无数据时使用模拟数据展示签到后的效果 */
const fetchAttendance = async () => {
  try {
    const res = (await getUserChecklist({})) as {
      status?: number;
      data?: {
        cumulativeSignDays?: number;
        signList?: { date?: string; time?: string }[];
      };
    };
    if (res.status === 1 && res.data) {
      attendance.value.currentStreak = res.data.cumulativeSignDays ?? 0;
      const today = new Date().toISOString().slice(0, 10);
      const list = res.data.signList;
      const todayRecord = Array.isArray(list)
        ? list.find((r: { date?: string }) => r.date === today)
        : null;
      attendance.value.todaySigned = !!todayRecord;
      attendance.value.todaySignTime = (todayRecord?.time as string) ?? "";
    } else {
      attendance.value.currentStreak = MOCK_AFTER_SIGN.currentStreak;
      attendance.value.todaySigned = true;
      attendance.value.todaySignTime = MOCK_AFTER_SIGN.todaySignTime;
    }
  } catch (error) {
    console.error("Failed to fetch attendance:", error);
    attendance.value.currentStreak = MOCK_AFTER_SIGN.currentStreak;
    attendance.value.todaySigned = true;
    attendance.value.todaySignTime = MOCK_AFTER_SIGN.todaySignTime;
  }
};

/** 今日签到时间展示文案（签到成功后显示） */
const todaySignTimeText = computed(() => {
  if (!attendance.value.todaySignTime) return "";
  return attendance.value.todaySignTime;
});

const milestonesList = computed(() => {
  let nextFound = false;
  const milestonesConfig = [
    { day: 4, amount: 500 },
    { day: 14, amount: 1500 },
    { day: attendance.value.totalDays, amount: 3500 },
  ];

  const list = milestonesConfig.map((config) => {
    const isCompleted = attendance.value.currentStreak >= config.day;
    let status = "upcoming";

    if (isCompleted) {
      status = "completed";
    } else if (!isCompleted && !nextFound) {
      status = "active";
      nextFound = true;
    }

    return {
      day: config.day,
      amount: formatCurrency(config.amount),
      status,
      isPerfect: false,
    };
  });

  return list;
});
interface Poster {
  id: number;
  url: string;
  title: string;
}
const posters = ref<Poster[]>([]);
const currentPoster = ref(0);
const postersLoading = ref(true);

const membershipLevels = ref<any[]>([]);
const isFetchingMemberships = ref(false);

const fetchMembershipLevels = async () => {
  isFetchingMemberships.value = true;
  try {
  } catch (error) {
    console.error("Failed to fetch memberships:", error);
  } finally {
    isFetchingMemberships.value = false;
  }
};

const showAlertPopup = ref(false);
const alertImages = ref<string[]>([]);

const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPod|BlackBerry|iPad|Windows Phone/i.test(
    navigator.userAgent
  );
};

const getFullUrl = (url: string, host: string) => {
  if (!url) return "";
  return url.startsWith("http") ? url : host + url;
};

/** 拉取海报/轮播图列表 */
const fetchPosters = async () => {
  postersLoading.value = true;
  try {
    const res = (await getIndex({})) as {
      status?: number;
      data?: {
        vip_list?: { name?: string; img?: string; url?: string }[];
        config?: {
          is_alert_img?: number;
          alert_img_pc?: string[];
          alert_img_h5?: string[];
        };
      };
    };

    const host =
      (import.meta as { env?: { VITE_INTERFACE_URL?: string } }).env
        ?.VITE_INTERFACE_URL || "";

    if (res.status !== 1 || !res.data) {
      posters.value = [];
      alertImages.value = [];
      return;
    }

    if (!res.data.vip_list || !Array.isArray(res.data.vip_list)) {
      posters.value = [];
    } else {
      posters.value = res.data.vip_list.map((p, i) => {
        const url = (p.img ?? p.url) as string;
        return {
          id: i,
          url: url ? getFullUrl(url, host) : "",
          title: (p.name as string) ?? "",
        };
      });
    }

    const config = res.data.config;
    const isAlertOpen = Number(config?.is_alert_img) > 0;
    const isMobile = isMobileDevice();

    const imageList = isMobile
      ? config?.alert_img_h5 || []
      : config?.alert_img_pc || [];

    alertImages.value = imageList
      .filter(Boolean)
      .map((img) => getFullUrl(img, host));

    const needShow = sessionStorage.getItem("showHomePopup");

    if (needShow === "1" && isAlertOpen && alertImages.value.length > 0) {
      showAlertPopup.value = true;
      sessionStorage.removeItem("showHomePopup");
    }
  } catch (error) {
    console.error("Failed to fetch promotions:", error);
  } finally {
    postersLoading.value = false;
  }
};

interface FooterImage {
  id: string | number;
  url: string;
}
const backendImages = ref<FooterImage[]>([]);
/** Certificate 为富文本 HTML 时用于 v-html 展示 */
const certificateHtml = ref("");

/** 拉取页脚法律/合规内容：Certificate 可能为富文本 HTML 或图片 URL 数组 */
const fetchLegalImages = async () => {
  try {
    const res = (await getConfig()) as {
      status?: number;
      data?: { config?: { Certificate?: string | string[] } };
    };
    if (res.status !== 1 || !res.data?.config?.Certificate) {
      backendImages.value = [];
      certificateHtml.value = "";
      return;
    }
    const host =
      (import.meta as { env?: { VITE_INTERFACE_URL?: string } }).env
        ?.VITE_INTERFACE_URL || "";
    const cert = res.data.config.Certificate;
    if (Array.isArray(cert)) {
      certificateHtml.value = "";
      backendImages.value = cert
        .map((url, i) => ({
          id: i,
          url:
            typeof url === "string"
              ? url.startsWith("http")
                ? url
                : host + url
              : "",
        }))
        .filter((item) => item.url);
    } else {
      const str = typeof cert === "string" ? cert : "";
      if (
        str.trim().startsWith("<") ||
        str.includes("</") ||
        str.includes("/>")
      ) {
        backendImages.value = [];
        certificateHtml.value = str.replace(
          /<img\s+([^>]*?)src=["']([^"']+)["']/gi,
          (_match, attrs, src) => {
            const fullSrc = src.startsWith("http")
              ? src
              : host + (src.startsWith("/") ? src : "/" + src);
            return `<img ${attrs}src="${fullSrc}"`;
          }
        );
      } else {
        certificateHtml.value = "";
        const url = str
          ? str.startsWith("http")
            ? str
            : host + (str.startsWith("/") ? "" : "/") + str
          : "";
        backendImages.value = url ? [{ id: 0, url }] : [];
      }
    }
  } catch (error) {
    console.error("Certificate load failed", error);
  }
};


const certificateImg = ref<string[]>([]);

/** 证书/活动图 */
const articleImages = async () => {
  try {
    certificateImg.value = [];

    let aid = 157;
    if (activeTab.value == "events") {
      aid = 158;
    } else if (activeTab.value == "legal") {
      aid = 157;
    } else {
      return;
    }

    const res = (await getArticle({ aid })) as {
      status?: number;
      data?: {
        multiple_image?: string[];
      };
    };

    await membershipLevelsImages();

    if (res.status !== 1 || !res.data) {
      return;
    }

    const host =
      (import.meta as { env?: { VITE_INTERFACE_URL?: string } }).env
        ?.VITE_INTERFACE_URL || "";
    const images = res.data.multiple_image;

    if (!Array.isArray(images) || images.length === 0) {
      certificateImg.value = [];
      currentCertificateIndex.value = 0;
      return;
    }

    certificateImg.value = images
      .filter((url): url is string => typeof url === "string" && !!url)
      .map((url) => {
        return url.startsWith("http")
          ? url
          : host + (url.startsWith("/") ? "" : "/") + url;
      });

    currentCertificateIndex.value = 0;
  } catch (error) {
    console.error("Certificate load failed", error);
  }
};

const membershipLevelsImg = ref<string[]>([]);

/** 等级图 */
const membershipLevelsImages = async () => {
  console.log("666", activeTab.value);

  try {
    membershipLevelsImg.value = [];

    let aid = 159;
    if (activeTab.value == "events") {
      aid = 159;
    } else {
      return;
    }

    const res = (await getArticle({ aid })) as {
      status?: number;
      data?: {
        multiple_image?: string[];
      };
    };

    if (res.status !== 1 || !res.data) {
      return;
    }

    const host =
      (import.meta as { env?: { VITE_INTERFACE_URL?: string } }).env
        ?.VITE_INTERFACE_URL || "";
    const images = res.data.multiple_image;

    if (!Array.isArray(images) || images.length === 0) {
      membershipLevelsImg.value = [];
      return;
    }

    membershipLevelsImg.value = images
      .filter((url): url is string => typeof url === "string" && !!url)
      .map((url) => {
        return url.startsWith("http")
          ? url
          : host + (url.startsWith("/") ? "" : "/") + url;
      });

    console.log("完整URL数组:", membershipLevelsImg.value);
  } catch (error) {
    console.error("Certificate load failed", error);
  }
};

/** 每 5 秒轮询 api/index/initStartData，离开页面时清除 */
const initStartDataTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const isPollingActive = ref(true);
const isRequestPending = ref(false)

const startSmartPolling = async () => {
  if (!isPollingActive.value || document.hidden || isRequestPending.value) return;

  isRequestPending.value = true; 
  
  try {
    await fetchAssignmentsState();
  } catch (error) {
    console.error("Polling error:", error);
  } finally {
    isRequestPending.value = false;
    
    if (isPollingActive.value && !document.hidden) {
      initStartDataTimer.value = setTimeout(startSmartPolling, 3000);
    }
  }
};

const handleVisibilityChange = () => {
  if (document.hidden) {
    if (initStartDataTimer.value) {
      clearTimeout(initStartDataTimer.value);
      initStartDataTimer.value = null;
    }
  } else {
    startSmartPolling();
  }
};

onMounted(async () => {
  window.scrollTo(0, 0);
  document.body.scrollTop = 0;
  document.documentElement.scrollTop = 0;
  
  setTimeout(() => {
    window.scrollTo(0, 0);
    if (mainScrollContainer.value) {
      mainScrollContainer.value.scrollTop = 0;
    }
  }, 100);
  
  await fetchUserData();
  fetchAttendance();
  fetchPosters();
  fetchLegalImages();
  articleImages();
  fetchMembershipLevels();

  getCardInfoHandle();
  await fetchTaskRecords();
  fetchPayoutHistory();

  isPollingActive.value = true;
  startSmartPolling();

  document.addEventListener("visibilitychange", handleVisibilityChange);
});

onUnmounted(() => {
  isPollingActive.value = false;
  if (initStartDataTimer.value != null) {
    clearTimeout(initStartDataTimer.value);
    initStartDataTimer.value = null;
  }

  if (payoutTimerId != null) {
    clearInterval(payoutTimerId);
    payoutTimerId = null;
  }
  
  document.removeEventListener("visibilitychange", handleVisibilityChange);
});

const currentCertificateIndex = ref(0);

const nextCertificateImg = () => {
  if (certificateImg.value.length) {
    currentCertificateIndex.value =
      (currentCertificateIndex.value + 1) % certificateImg.value.length;
  }
};

const prevCertificateImg = () => {
  if (certificateImg.value.length) {
    currentCertificateIndex.value =
      (currentCertificateIndex.value - 1 + certificateImg.value.length) %
      certificateImg.value.length;
  }
};

const ui = computed(() => ({
  metaTitle: t("dashboard.meta_title", "Dashboard"),
  sidebar: {
    overview: t("dashboard.nav.overview", "Account Settings"),
    assignments: t("dashboard.nav.assignments", "Active Assignments"),
    payouts: t("dashboard.nav.payouts", "Manage Payouts"),
    rewards: t("dashboard.nav.rewards", "Performance Rewards"),
    events: t("dashboard.nav.events", "Events & Membership"),
    referrals: t("dashboard.nav.referrals", "Referral Program"),
    faq: t("dashboard.nav.faq", "Frequently Asked Questions"),
    terms: t("dashboard.nav.terms", "Terms of Service"),
    privacy: t("dashboard.nav.privacy", "Privacy Policy"),
    cookies: t("dashboard.nav.cookies", "Cookie Policy"),
    legal: t("dashboard.nav.legal", "Legal & Registration"),
  },
}));

useHead({ title: () => ui.value.metaTitle });

const isSidebarOpen = ref(false);
const activeTab = ref<keyof typeof ui.value.sidebar>("assignments");
const toggleSidebar = () => (isSidebarOpen.value = !isSidebarOpen.value);

const tabOrder = [
  "overview",
  "assignments",
  "payouts",
  "rewards",
  "events",
  "referrals",
  "faq",
  "terms",
  "privacy",
  "cookies",
  "legal",
];

const transitionName = ref("slide-down");
const previousActiveTab = ref<keyof typeof ui.value.sidebar>("assignments");

watch(activeTab, (newTab: string, oldTab: string) => {
  previousActiveTab.value = oldTab as keyof typeof ui.value.sidebar;
  const newIndex = tabOrder.indexOf(newTab);
  const oldIndex = tabOrder.indexOf(oldTab);
  transitionName.value = newIndex > oldIndex ? "slide-up" : "slide-down";

  if (mainScrollContainer.value) {
    mainScrollContainer.value.scrollTop = 0;
  }
  if (newTab === 'payouts' && !userData.value.hasPassphrase) {
    showSetupPassphraseModal.value = true;
  }
});

const handleCancelPassphraseSetup = () => {
  showSetupPassphraseModal.value = false;
  if (activeTab.value === 'payouts') {
    activeTab.value = previousActiveTab.value;
  }
};

const getTabIcon = (key: string) => {
  const icons: Record<string, string> = {
    overview: "settings",
    assignments: "data_object",
    payouts: "account_balance_wallet",
    rewards: "event_available",
    events: "leaderboard",
    referrals: "group_add",
    faq: "help_outline",
    terms: "article",
    privacy: "security",
    cookies: "cookie",
    legal: "gavel",
  };
  return icons[key] || "circle";
};

const payoutConfirmModal = ref({
  show: false,
  amount: "",
  destination: "",
  method: "",
  accountName: "",
  icon:""
});

const showSetupPassphraseModal = ref(false);

const payoutCountdown = ref(0);
let payoutTimerId: ReturnType<typeof setInterval> | null = null;

const closePayoutModal = () => {
  payoutConfirmModal.value.show = false;
  if (payoutTimerId) {
    clearInterval(payoutTimerId);
    payoutTimerId = null;
  }
};

</script>

<template>
  <div
    class="h-screen bg-[#fafafa] dark:bg-[#000000] flex w-full overflow-hidden text-[#171717] dark:text-[#ededed] font-sans relative"
  >
    <div
      v-if="showConfetti"
      class="fixed inset-0 pointer-events-none z-9999 overflow-hidden flex justify-center"
    >
      <div
        v-for="i in 60"
        :key="i"
        class="confetti"
        :style="getConfettiStyle()"
      ></div>
    </div>

    <div
      v-if="isSidebarOpen"
      @click="toggleSidebar"
      class="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
    ></div>

    <aside
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
      class="fixed lg:static top-0 left-0 h-full w-62.5 bg-white dark:bg-[#000000] border-r border-black/10 dark:border-white/10 z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col shrink-0 box-border"
    >
      <div
        class="h-16 shrink-0 flex items-center justify-between px-6 border-b border-black/10 dark:border-white/10 box-border"
      >
        <div class="block cursor-pointer relative z-10 hover:opacity-80">
          <img
            src="/images/logodark.png"
            :alt="t('dashboard.nav.logo_alt', 'Logo')"
            class="h-7 w-auto block dark:hidden"
          />
          <img
            src="/images/logolight.png"
            :alt="t('dashboard.nav.logo_alt', 'Logo')"
            class="h-7 w-auto hidden dark:block"
          />
        </div>
        <button
          @click="toggleSidebar"
          class="lg:hidden text-gray-500 hover:text-black dark:hover:text-white"
        >
          <span class="material-icons-round text-xl">close</span>
        </button>
      </div>

      <nav class="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
        <button
          v-for="(label, key) in ui.sidebar"
          :key="key"
          @click="
            activeTab = key;
            isSidebarOpen = false;
            articleImages();
          "
          :class="[
            'relative w-full flex items-center gap-4 px-3 py-2.5 rounded-md text-[13px] font-medium text-left',
            activeTab === key
              ? 'bg-[#f0f0f0] dark:bg-[#1a1a1a] text-black dark:text-white'
              : 'text-[#666666] dark:text-[#a1a1a1] hover:bg-[#fafafa] dark:hover:bg-[#111111] hover:text-black dark:hover:text-white',
          ]"
        >
          <span
            class="material-icons-round text-[16px] flex items-center justify-center text-[#888] dark:text-[#666]"
            :class="activeTab === key ? 'text-black dark:text-white' : ''"
          >
            {{ getTabIcon(key as string) }}
          </span>
          {{ label }}
          <span
            v-if="key === 'overview' && isUserDataLoaded && !userData.hasPassphrase"
            class="absolute right-3 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_4px_rgba(239,68,68,0.5)]"
          ></span>
        </button>
      </nav>

      <div
        class="p-5 border-t border-black/10 dark:border-white/10 bg-[#fafafa] dark:bg-[#0a0a0a] flex flex-col gap-4 shrink-0"
      >
        <div class="flex items-start gap-3">
          <div
            v-if="userData.profilePicUrl"
            class="w-8 h-8 rounded-full bg-cover bg-center border border-black/10 dark:border-white/10 shrink-0 mt-0.5"
            :style="{ backgroundImage: `url(${userData.profilePicUrl})` }"
          ></div>
          <div
            v-else
            class="w-8 h-8 rounded-full bg-white dark:bg-[#111] flex items-center justify-center border border-black/10 dark:border-white/10 shrink-0 mt-0.5"
          >
            <span
              class="material-icons-round text-[#666] dark:text-[#a1a1a1] text-[15px]"
              >person</span
            >
          </div>
          <div class="flex-1 min-w-0">
            <p
              class="text-[13px] font-semibold text-black dark:text-white leading-[1.3] wrap-break-word whitespace-normal"
            >
              {{ userData.displayName }}
            </p>
            <p
              class="text-[11px] text-[#0070f3] dark:text-[#3291ff] font-medium mt-0.5"
            >
              {{ userData.accountTier }}
            </p>
          </div>
        </div>
        <div class="px-3 py-1.5 flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span
                class="material-icons-round text-[16px] transition-colors duration-500"
                :class="creditScoreDetails.colorClass"
                >speed</span
              >
              <span
                class="text-[12px] font-medium text-[#666] dark:text-[#a1a1a1]"
              >
                {{ t("dashboard.overview.credit_score", "Credit Score") }}
              </span>
            </div>
            <span
              class="text-[13px] font-bold transition-colors duration-500"
              :class="creditScoreDetails.colorClass"
            >
              {{ creditScoreDetails.text }}
            </span>
          </div>

          <div
            class="w-full h-1.5 rounded-full overflow-hidden transition-colors duration-500"
            :class="creditScoreDetails.bgClass"
          >
            <div
              class="h-full rounded-full transition-all duration-700 ease-out"
              :class="creditScoreDetails.barClass"
              :style="{ width: creditScoreDetails.value + '%' }"
            ></div>
          </div>
        </div>

        <button
          @click="handleLogout"
          class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-black text-[#666] dark:text-[#a1a1a1] hover:text-black dark:hover:text-white hover:bg-[#fafafa] dark:hover:bg-[#111] text-[12px] font-medium shadow-sm"
        >
          <span class="material-icons-round text-[14px] opacity-70"
            >logout</span
          >
          {{ t("dashboard.nav.logout", "Logout") }}
        </button>
      </div>

      <div
        class="py-3 shrink-0 mt-auto flex items-center justify-center gap-2 text-[12px] text-[#666] dark:text-[#a1a1a1] bg-[#fafafa] dark:bg-[#0a0a0a] border-t border-black/10 dark:border-white/10"
      >
        <span
          class="w-1.5 h-1.5 bg-[#16a34a] rounded-full shadow-[0_0_4px_#16a34a]"
        ></span>
        {{ t("home.footer.status", "All systems normal") }}
      </div>
    </aside>

    <main class="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <header
        class="z-30 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-black/10 dark:border-white/10 px-8 h-16 shrink-0 flex items-center justify-between box-border"
      >
        <div class="flex items-center gap-4">
          <button
            @click="toggleSidebar"
            class="lg:hidden text-[#666] dark:text-[#a1a1a1] hover:text-black dark:hover:text-white"
          >
            <span class="material-icons-round text-xl">menu</span>
          </button>
        </div>
        <div class="flex items-center gap-3">
          <div
            v-if="userData.isCoachAccount"
            class="px-3 py-1.5 rounded text-sm border flex items-center gap-2 bg-[#e0f2fe] dark:bg-[#0369a1]/30 text-[#0284c7] dark:text-[#38bdf8] border-[#bae6fd] dark:border-[#0284c7]/50 shadow-sm"
          >
            <span class="hidden sm:inline">{{
              t(
                "dashboard.coach_account",
                "This is a coach account for training purposes."
              )
            }}</span>
            <span class="inline sm:hidden">{{
              t("dashboard.coach_account_short", "Coach Account")
            }}</span>
          </div>
          <ThemeLangSwitch />
        </div>
      </header>

      <div ref="mainScrollContainer" class="flex-1 overflow-y-auto relative w-full">
        <div class="p-6 lg:p-10 max-w-5xl mx-auto w-full pb-24 lg:pb-16">
          <Transition :name="transitionName" mode="out-in">
           <div :key="activeTab" class="w-full">
            <template v-if="activeTab === 'overview'">
              <div class="w-full space-y-6">
                <h2
                  class="text-xl font-semibold text-black dark:text-white tracking-tight mb-4"
                >
                  <span
                    v-if="userData.displayName && userData.displayName !== '-'"
                    >{{
                      t("dashboard.overview.welcome", {
                        name: userData.displayName,
                      })
                    }}</span
                  >
                  <span v-else-if="userData.displayName === '-'">{{
                    t("dashboard.overview.welcome", { name: "" })
                  }}</span>
                  <span
                    v-else
                    class="animate-pulse bg-gray-200 dark:bg-zinc-800 h-6 w-48 rounded inline-block"
                  ></span>
                </h2>
                <p class="text-[14px] text-[#666] dark:text-[#a1a1a1] mb-8">
                  {{
                    t(
                      "dashboard.overview.subtitle",
                      "Manage your profile, security preferences, and payout configurations."
                    )
                  }}
                </p>

                <section
                  class="bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-lg p-6"
                >
                  <h3
                    class="text-[15px] font-semibold text-black dark:text-white mb-4"
                  >
                    {{
                      t("dashboard.overview.profile_title", "Public Profile")
                    }}
                  </h3>
                  <div class="flex items-center gap-6">
                    <div
                      class="w-20 h-20 rounded-full bg-[#fafafa] dark:bg-[#111] border border-black/10 dark:border-white/10 flex items-center justify-center overflow-hidden bg-cover bg-center"
                      :style="
                        userData.profilePicUrl
                          ? {
                              backgroundImage: `url(${userData.profilePicUrl})`,
                            }
                          : {}
                      "
                    >
                      <span
                        v-if="!userData.profilePicUrl"
                        class="material-icons-round text-3xl text-[#666] dark:text-[#555]"
                        >person</span
                      >
                    </div>
                    <div>
                      <input
                        type="file"
                        ref="fileInput"
                        class="hidden"
                        accept="image/*"
                        @change="handleFileUpload"
                      />
                      <button
                        @click="triggerUpload"
                        :disabled="isUploadingAvatar"
                        type="button"
                        class="bg-black text-white dark:bg-white dark:text-black px-4 py-2.5 rounded-md text-[13px] font-medium hover:bg-gray-800 dark:hover:bg-gray-200 mb-2 border border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {{
                          isUploadingAvatar
                            ? t("dashboard.modal.processing", "Processing...")
                            : t("dashboard.overview.upload_btn", "Upload Photo")
                        }}
                      </button>
                      <p class="text-[12px] text-[#666] dark:text-[#a1a1a1]">
                        {{
                          t(
                            "dashboard.overview.upload_hint",
                            "JPG or PNG. Max size of 2MB."
                          )
                        }}
                      </p>
                    </div>
                  </div>
                </section>

                <section
                  class="bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-lg p-6"
                >
                  <h3
                    class="text-[15px] font-semibold text-black dark:text-white mb-4"
                  >
                    {{ t("dashboard.overview.auth_title", "Update Password") }}
                  </h3>

                  <div class="space-y-4 max-w-sm">
                    <div class="relative w-full">
                      <input
                        @keydown.space.prevent
                        v-model="securityForm.oldPassword"
                        :type="passwordVisible.pwdOld ? 'text' : 'password'"
                        placeholder=" "
                        class="peer w-full p-[14px_16px] pr-12 text-[14px] rounded-md bg-transparent border outline-none z-1 focus:border-2 focus:p-[13px_15px] focus:pr-11.75 border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20"
                      />
                      <label
                        class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-white dark:bg-[#0a0a0a] px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left transition-[top,transform,scale] duration-200 ease-in-out peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 text-[#666] dark:text-[#a1a1a1] peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]"
                      >
                        {{
                          t(
                            "dashboard.overview.current_pass",
                            "Current Password"
                          )
                        }}
                      </label>
                      <button
                        @click="togglePasswordVisible('pwdOld')"
                        type="button"
                        class="absolute right-4 top-0 bottom-0 my-auto flex items-center justify-center text-[#999] hover:text-black dark:text-[#666] dark:hover:text-white transition-colors z-10"
                        tabindex="-1"
                      >
                        <span class="material-icons-round text-[20px]">{{
                          passwordVisible.pwdOld
                            ? "visibility_off"
                            : "visibility"
                        }}</span>
                      </button>
                    </div>
                    <div class="relative w-full">
                      <input
                        @keydown.space.prevent
                        v-model="securityForm.newPassword"
                        :type="passwordVisible.pwdNew ? 'text' : 'password'"
                        placeholder=" "
                        class="peer w-full p-[14px_16px] pr-12 text-[14px] rounded-md bg-transparent border outline-none z-1 focus:border-2 focus:p-[13px_15px] focus:pr-11.75 border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20"
                        :class="{
                          'border-red-500 text-red-500 focus:border-red-500':
                            newPasswordError && securityForm.newPassword,
                        }"
                      />
                      <label
                        class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-white dark:bg-[#0a0a0a] px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left transition-[top,transform,scale] duration-200 ease-in-out peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 text-[#666] dark:text-[#a1a1a1] peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]"
                        :class="{
                          'text-red-500 peer-focus:text-red-500':
                            newPasswordError && securityForm.newPassword,
                        }"
                      >
                        {{ t("dashboard.overview.new_pass", "New Password") }}
                      </label>
                      <button
                        @click="togglePasswordVisible('pwdNew')"
                        type="button"
                        class="absolute right-4 top-0 bottom-0 my-auto flex items-center justify-center text-[#999] hover:text-black dark:text-[#666] dark:hover:text-white transition-colors z-10"
                        tabindex="-1"
                      >
                        <span class="material-icons-round text-[20px]">{{
                          passwordVisible.pwdNew
                            ? "visibility_off"
                            : "visibility"
                        }}</span>
                      </button>
                    </div>
                    <div
                      v-if="securityForm.newPassword && newPasswordError"
                      class="text-red-500 text-xs mt-1"
                    >
                      {{ newPasswordError }}
                    </div>

                    <div class="relative w-full">
                      <input
                        @keydown.space.prevent
                        v-model="securityForm.confirmNewPassword"
                        :type="passwordVisible.pwdConfirm ? 'text' : 'password'"
                        placeholder=" "
                        class="peer w-full p-[14px_16px] pr-12 text-[14px] rounded-md bg-transparent border outline-none z-1 focus:border-2 focus:p-[13px_15px] focus:pr-11.75 border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20"
                        :class="{
                          'border-red-500 text-red-500 focus:border-red-500':
                            confirmNewPasswordError &&
                            securityForm.confirmNewPassword,
                        }"
                      />
                      <label
                        class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-white dark:bg-[#0a0a0a] px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left transition-[top,transform,scale] duration-200 ease-in-out peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 text-[#666] dark:text-[#a1a1a1] peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]"
                        :class="{
                          'text-red-500 peer-focus:text-red-500':
                            confirmNewPasswordError &&
                            securityForm.confirmNewPassword,
                        }"
                      >
                        {{
                          t(
                            "dashboard.overview.confirm_pass",
                            "Confirm New Password"
                          )
                        }}
                      </label>
                      <button
                        @click="togglePasswordVisible('pwdConfirm')"
                        type="button"
                        class="absolute right-4 top-0 bottom-0 my-auto flex items-center justify-center text-[#999] hover:text-black dark:text-[#666] dark:hover:text-white transition-colors z-10"
                        tabindex="-1"
                      >
                        <span class="material-icons-round text-[20px]">{{
                          passwordVisible.pwdConfirm
                            ? "visibility_off"
                            : "visibility"
                        }}</span>
                      </button>
                    </div>
                    <div
                      v-if="
                        securityForm.confirmNewPassword &&
                        confirmNewPasswordError
                      "
                      class="text-red-500 text-xs mt-1"
                    >
                      {{ confirmNewPasswordError }}
                    </div>

                    <button
                      @click="savePassword"
                      :disabled="
                        isSavingPassword ||
                        !securityForm.oldPassword ||
                        !securityForm.newPassword ||
                        newPasswordError !== '' ||
                        confirmNewPasswordError !== ''
                      "
                      class="w-full sm:w-auto bg-black text-white dark:bg-white dark:text-black px-5 py-2.5 rounded-md text-[13px] font-medium hover:bg-gray-800 dark:hover:bg-gray-200 mt-2 border border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {{
                        isSavingPassword
                          ? t("dashboard.modal.processing", "Processing...")
                          : t("dashboard.overview.save_pass", "Save Password")
                      }}
                    </button>
                  </div>
                </section>

                <section
                  class="bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-lg p-6"
                >
                  <div class="flex items-center gap-3 mb-4">
                    <h3
                      class="text-[15px] font-semibold text-black dark:text-white"
                    >
                      {{
                        t(
                          "dashboard.overview.passphrase_title",
                          "Payout Passphrase"
                        )
                      }}
                    </h3>
                    <span
                      v-if="!userData.hasPassphrase"
                      class="bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase border border-red-500/20"
                      >{{
                        t(
                          "dashboard.overview.first_time_setup",
                          "First Time Setup Required"
                        )
                      }}</span
                    >
                  </div>

                  <p
                    v-if="!userData.hasPassphrase"
                    class="text-[13px] text-[#666] dark:text-[#a1a1a1] leading-relaxed mb-6 max-w-2xl"
                  >
                    {{
                      t(
                        "dashboard.overview.passphrase_desc",
                        "This passphrase acts as your private financial key, required to authorize payouts in the Manage Payouts portal. To configure this key initially, you must provide your registered account email."
                      )
                    }}
                  </p>
                  <p
                    v-else
                    class="text-[13px] text-[#666] dark:text-[#a1a1a1] leading-relaxed mb-6 max-w-2xl"
                  >
                    {{
                      t(
                        "dashboard.overview.passphrase_update_desc",
                        "Update your private financial key. This key is securely required to authorize all of your standard withdrawal requests."
                      )
                    }}
                  </p>

                  <div
                    v-if="!userData.hasPassphrase"
                    class="space-y-4 max-w-sm"
                  >
                    <div class="relative w-full">
                      <input
                        @keydown.space.prevent
                        v-model="passphraseForm.passphrase"
                        :type="
                          passwordVisible.phraseSetup ? 'text' : 'password'
                        "
                        placeholder=" "
                        class="peer w-full p-[14px_16px] pr-12 text-[14px] rounded-md bg-transparent border outline-none z-1 focus:border-2 focus:p-[13px_15px] focus:pr-11.75 border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20"
                        :class="{
                          'border-red-500 text-red-500 focus:border-red-500':
                            newPassphraseError && passphraseForm.passphrase,
                        }"
                      />
                      <label
                        class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-white dark:bg-[#0a0a0a] px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left transition-[top,transform,scale] duration-200 ease-in-out text-[#666] dark:text-[#a1a1a1] peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]"
                        :class="{
                          'text-red-500 peer-focus:text-red-500':
                            newPassphraseError && passphraseForm.passphrase,
                        }"
                      >
                        {{
                          t(
                            "dashboard.overview.new_passphrase",
                            "New Passphrase"
                          )
                        }}
                      </label>
                      <button
                        @click="togglePasswordVisible('phraseSetup')"
                        type="button"
                        class="absolute right-4 top-0 bottom-0 my-auto flex items-center justify-center text-[#999] hover:text-black dark:text-[#666] dark:hover:text-white transition-colors z-10"
                        tabindex="-1"
                      >
                        <span class="material-icons-round text-[20px]">{{
                          passwordVisible.phraseSetup
                            ? "visibility_off"
                            : "visibility"
                        }}</span>
                      </button>
                    </div>
                    <div
                      v-if="passphraseForm.passphrase && newPassphraseError"
                      class="text-red-500 text-xs mt-1"
                    >
                      {{ newPassphraseError }}
                    </div>

                    <div class="relative w-full">
                      <input
                        @keydown.space.prevent
                        v-model="passphraseForm.confirmPassphrase"
                        :type="
                          passwordVisible.phraseSetupConfirm
                            ? 'text'
                            : 'password'
                        "
                        placeholder=" "
                        class="peer w-full p-[14px_16px] pr-12 text-[14px] rounded-md bg-transparent border outline-none z-1 focus:border-2 focus:p-[13px_15px] focus:pr-11.75 border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20"
                        :class="{
                          'border-red-500 text-red-500 focus:border-red-500':
                            confirmPassphraseError &&
                            passphraseForm.confirmPassphrase,
                        }"
                      />
                      <label
                        class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-white dark:bg-[#0a0a0a] px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left transition-[top,transform,scale] duration-200 ease-in-out text-[#666] dark:text-[#a1a1a1] peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]"
                        :class="{
                          'text-red-500 peer-focus:text-red-500':
                            confirmPassphraseError &&
                            passphraseForm.confirmPassphrase,
                        }"
                      >
                        {{
                          t(
                            "dashboard.overview.confirm_passphrase",
                            "Confirm Passphrase"
                          )
                        }}
                      </label>
                      <button
                        @click="togglePasswordVisible('phraseSetupConfirm')"
                        type="button"
                        class="absolute right-4 top-0 bottom-0 my-auto flex items-center justify-center text-[#999] hover:text-black dark:text-[#666] dark:hover:text-white transition-colors z-10"
                        tabindex="-1"
                      >
                        <span class="material-icons-round text-[20px]">{{
                          passwordVisible.phraseSetupConfirm
                            ? "visibility_off"
                            : "visibility"
                        }}</span>
                      </button>
                    </div>
                    <div
                      v-if="
                        passphraseForm.confirmPassphrase &&
                        confirmPassphraseError
                      "
                      class="text-red-500 text-xs mt-1"
                    >
                      {{ confirmPassphraseError }}
                    </div>

                    <button
                      @click="configurePassphrase"
                      :disabled="isConfiguringPassphrase || !isSetupValid"
                      class="w-full bg-black text-white dark:bg-white dark:text-black px-5 py-3 rounded-md text-[13px] font-medium mt-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 border border-transparent"
                    >
                      {{
                        isConfiguringPassphrase
                          ? t("dashboard.modal.processing", "Processing...")
                          : t("dashboard.overview.verify_btn", "Configure Key")
                      }}
                    </button>
                  </div>

                  <div v-else class="space-y-4 max-w-sm">
                    <div class="relative w-full">
                      <input
                        @keydown.space.prevent
                        v-model="passphraseForm.currentPassphrase"
                        :type="
                          passwordVisible.phraseCurrent ? 'text' : 'password'
                        "
                        placeholder=" "
                        class="peer w-full p-[14px_16px] pr-12 text-[14px] rounded-md bg-transparent border outline-none z-1 focus:border-2 focus:p-[13px_15px] focus:pr-11.75 border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20"
                      />
                      <label
                        class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-white dark:bg-[#0a0a0a] px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left transition-[top,transform,scale] duration-200 ease-in-out text-[#666] dark:text-[#a1a1a1] peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]"
                      >
                        {{
                          t(
                            "dashboard.overview.current_passphrase",
                            "Current Passphrase"
                          )
                        }}
                      </label>
                      <button
                        @click="togglePasswordVisible('phraseCurrent')"
                        type="button"
                        class="absolute right-4 top-0 bottom-0 my-auto flex items-center justify-center text-[#999] hover:text-black dark:text-[#666] dark:hover:text-white transition-colors z-10"
                        tabindex="-1"
                      >
                        <span class="material-icons-round text-[20px]">{{
                          passwordVisible.phraseCurrent
                            ? "visibility_off"
                            : "visibility"
                        }}</span>
                      </button>
                    </div>
                    <div class="relative w-full">
                      <input
                        @keydown.space.prevent
                        v-model="passphraseForm.passphrase"
                        :type="passwordVisible.phraseNew ? 'text' : 'password'"
                        placeholder=" "
                        class="peer w-full p-[14px_16px] pr-12 text-[14px] rounded-md bg-transparent border outline-none z-1 focus:border-2 focus:p-[13px_15px] focus:pr-11.75 border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20"
                        :class="{
                          'border-red-500 text-red-500 focus:border-red-500':
                            newPassphraseError && passphraseForm.passphrase,
                        }"
                      />
                      <label
                        class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-white dark:bg-[#0a0a0a] px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left transition-[top,transform,scale] duration-200 ease-in-out text-[#666] dark:text-[#a1a1a1] peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]"
                        :class="{
                          'text-red-500 peer-focus:text-red-500':
                            newPassphraseError && passphraseForm.passphrase,
                        }"
                      >
                        {{
                          t(
                            "dashboard.overview.new_passphrase",
                            "New Passphrase"
                          )
                        }}
                      </label>
                      <button
                        @click="togglePasswordVisible('phraseNew')"
                        type="button"
                        class="absolute right-4 top-0 bottom-0 my-auto flex items-center justify-center text-[#999] hover:text-black dark:text-[#666] dark:hover:text-white transition-colors z-10"
                        tabindex="-1"
                      >
                        <span class="material-icons-round text-[20px]">{{
                          passwordVisible.phraseNew
                            ? "visibility_off"
                            : "visibility"
                        }}</span>
                      </button>
                    </div>
                    <div
                      v-if="passphraseForm.passphrase && newPassphraseError"
                      class="text-red-500 text-xs mt-1"
                    >
                      {{ newPassphraseError }}
                    </div>

                    <div class="relative w-full">
                      <input
                        @keydown.space.prevent
                        v-model="passphraseForm.confirmPassphrase"
                        :type="
                          passwordVisible.phraseConfirm ? 'text' : 'password'
                        "
                        placeholder=" "
                        class="peer w-full p-[14px_16px] pr-12 text-[14px] rounded-md bg-transparent border outline-none z-1 focus:border-2 focus:p-[13px_15px] focus:pr-11.75 border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20"
                        :class="{
                          'border-red-500 text-red-500 focus:border-red-500':
                            confirmPassphraseError &&
                            passphraseForm.confirmPassphrase,
                        }"
                      />
                      <label
                        class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-white dark:bg-[#0a0a0a] px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left transition-[top,transform,scale] duration-200 ease-in-out text-[#666] dark:text-[#a1a1a1] peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]"
                        :class="{
                          'text-red-500 peer-focus:text-red-500':
                            confirmPassphraseError &&
                            passphraseForm.confirmPassphrase,
                        }"
                      >
                        {{
                          t(
                            "dashboard.overview.confirm_passphrase",
                            "Confirm Passphrase"
                          )
                        }}
                      </label>
                      <button
                        @click="togglePasswordVisible('phraseConfirm')"
                        type="button"
                        class="absolute right-4 top-0 bottom-0 my-auto flex items-center justify-center text-[#999] hover:text-black dark:text-[#666] dark:hover:text-white transition-colors z-10"
                        tabindex="-1"
                      >
                        <span class="material-icons-round text-[20px]">{{
                          passwordVisible.phraseConfirm
                            ? "visibility_off"
                            : "visibility"
                        }}</span>
                      </button>
                    </div>
                    <div
                      v-if="
                        passphraseForm.confirmPassphrase &&
                        confirmPassphraseError
                      "
                      class="text-red-500 text-xs mt-1"
                    >
                      {{ confirmPassphraseError }}
                    </div>

                    <button
                      @click="updatePassphrase"
                      :disabled="isUpdatingPassphrase || !isUpdateValid"
                      class="w-full sm:w-auto bg-black text-white dark:bg-white dark:text-black px-5 py-3 rounded-md text-[13px] font-medium mt-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 border border-transparent"
                    >
                      {{
                        isUpdatingPassphrase
                          ? t("dashboard.modal.processing", "Processing...")
                          : t("dashboard.overview.update_btn", "Update Key")
                      }}
                    </button>
                  </div>
                </section>
              </div>
            </template>

            <template v-else-if="activeTab === 'referrals'">
              <div class="w-full space-y-6">
                <h2
                  class="text-xl font-semibold text-black dark:text-white tracking-tight flex items-center mb-4"
                >
                  {{ t("dashboard.referrals.title", "Referral Program") }}
                  <span
                    class="text-[10px] font-bold bg-[#eaeaea] dark:bg-[#222] text-[#888] dark:text-[#aaa] px-2 py-0.5 rounded ml-3 tracking-widest uppercase"
                    >{{ t("dashboard.referrals.optional", "Optional") }}</span
                  >
                </h2>
                <p class="text-[14px] text-[#666] dark:text-[#a1a1a1] mb-8">
                  {{
                    t(
                      "dashboard.referrals.subtitle",
                      "The referral program is a completely optional feature. Your daily assignments, attendance, and primary payouts will not be affected whether you participate or not."
                    )
                  }}
                </p>

              <div v-if="userData.isCoachAccount" class="px-4 py-2.5 rounded-md border flex items-center justify-center gap-2 bg-[#f8fafc] dark:bg-[#0f172a]/50 text-[#64748b] dark:text-[#94a3b8] border-[#e2e8f0] dark:border-[#1e293b]">
                <span class="material-icons-round text-[16px]">visibility</span>
                <span class="text-[13px] font-medium">
                  {{ t("dashboard.rewards.coach_restricted", "Attendance payouts, membership bonuses and referral program are not applicable to coach accounts.") }}
                </span>
              </div>

                <section
                  v-if="!userData.isCoachAccount"
                  class="bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-lg p-6"
                >
                  <h3
                    class="text-[15px] font-semibold text-black dark:text-white mb-2"
                  >
                    {{ t("dashboard.referrals.your_id", "Your Referral ID") }}
                  </h3>
                  <p
                    class="text-[13px] text-[#666] dark:text-[#a1a1a1] leading-relaxed mb-5 max-w-2xl"
                  >
                    {{
                      t(
                        "dashboard.referrals.id_desc",
                        "Copy your unique referral ID below. Share it with someone who could benefit from our company, and start earning a lifetime bonus on their generated incomes."
                      )
                    }}
                  </p>
                  <div class="relative inline-flex items-center">
                    <input
                      type="text"
                      readonly
                      :value="userData.referralId"
                      class="w-48 p-[14px_16px] pr-12 text-[14px] rounded-md bg-transparent border border-black/20 dark:border-white/20 text-black dark:text-white font-mono focus:outline-none focus:border-black/50 dark:focus:border-white/50 selection:bg-black/10 dark:selection:bg-white/20 transition-colors"
                    />
                    <button
                      @click="copyReferralId"
                      class="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 text-[#666] hover:text-black dark:text-[#a1a1a1] dark:hover:text-white rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                      :title="t('dashboard.referrals.copy', 'Copy')"
                    >
                      <span
                        v-if="copySuccess"
                        class="material-icons-round text-[18px] text-[#16a34a]"
                        >check</span
                      >
                      <span v-else class="material-icons-round text-[18px]"
                        >content_copy</span
                      >
                    </button>
                  </div>
                </section>

                <section
                  class="bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-lg p-8 mt-6"
                >
                  <div
                    class="prose dark:prose-invert max-w-none text-[14px] text-[#444] dark:text-[#ccc] leading-relaxed space-y-8"
                  >
                    <div>
                      <h3
                        class="text-[15px] font-semibold text-black dark:text-white mb-3"
                      >
                        {{
                          t(
                            "dashboard.referrals.overview_title",
                            "Program Overview"
                          )
                        }}
                      </h3>
                      <p v-html="t('dashboard.referrals.overview_p1')"></p>
                      <ul
                        class="list-disc pl-5 mt-3 space-y-1.5 text-[#666] dark:text-[#a1a1a1]"
                      >
                        <li>{{ t("dashboard.referrals.overview_l1") }}</li>
                        <li>{{ t("dashboard.referrals.overview_l2") }}</li>
                        <li>{{ t("dashboard.referrals.overview_l3") }}</li>
                      </ul>
                    </div>

                    <div
                      class="border-t border-black/10 dark:border-white/10 pt-6"
                    >
                      <h3
                        class="text-[15px] font-semibold text-black dark:text-white mb-3"
                      >
                        {{
                          t(
                            "dashboard.referrals.mlm_title",
                            "Strictly Direct Referrals (No MLM)"
                          )
                        }}
                      </h3>
                      <p>{{ t("dashboard.referrals.mlm_desc") }}</p>
                    </div>

                    <div
                      class="border-t border-black/10 dark:border-white/10 pt-6"
                    >
                      <h3
                        class="text-[15px] font-semibold text-black dark:text-white mb-3"
                      >
                        {{
                          t(
                            "dashboard.referrals.paused_title",
                            "Pending Assignments & Paused Bonuses"
                          )
                        }}
                      </h3>
                      <p>{{ t("dashboard.referrals.paused_desc") }}</p>
                    </div>

                    <div
                      class="border-t border-black/10 dark:border-white/10 pt-6"
                    >
                      <h3
                        class="text-[15px] font-semibold text-black dark:text-white mb-3"
                      >
                        {{
                          t(
                            "dashboard.referrals.eligibility_title",
                            "Eligibility & Limitations"
                          )
                        }}
                      </h3>
                      <ul
                        class="list-disc pl-5 mt-3 space-y-3 text-[#666] dark:text-[#a1a1a1]"
                      >
                        <li
                          v-html="t('dashboard.referrals.eligibility_l1')"
                        ></li>
                        <li
                          v-html="t('dashboard.referrals.eligibility_l2')"
                        ></li>
                        <li
                          v-html="t('dashboard.referrals.eligibility_l3')"
                        ></li>
                      </ul>
                    </div>
                  </div>
                </section>
              </div>
            </template>

            <template v-else-if="activeTab === 'rewards'">
              <div class="w-full space-y-6">
                <!-- 签到成功效果：今日已签到时展示 -->
                <section
                  v-if="attendance.todaySigned"
                  class="rounded-lg p-5 border-l-4 border-[#16a34a] bg-[#16a34a]/10 dark:bg-[#16a34a]/20 border border-[#16a34a]/20 dark:border-[#16a34a]/30"
                >
                  <div class="flex items-center gap-4">
                    <span class="material-icons-round text-4xl text-[#16a34a]"
                      >check_circle</span
                    >
                    <div class="flex-1">
                      <h3
                        class="text-lg font-semibold text-black dark:text-white"
                      >
                        {{
                          t(
                            "dashboard.rewards.sign_success_title",
                            "Check-in successful"
                          )
                        }}
                      </h3>
                      <p
                        class="text-[14px] text-[#666] dark:text-[#a1a1a1] mt-1"
                      >
                        {{
                          t(
                            "dashboard.rewards.sign_success_today",
                            "Today checked in"
                          )
                        }}
                        <span
                          v-if="todaySignTimeText"
                          class="font-medium text-[#16a34a]"
                          >{{ todaySignTimeText }}</span
                        >
                      </p>
                      <p
                        class="text-[13px] text-[#666] dark:text-[#a1a1a1] mt-2"
                      >
                        {{
                          t(
                            "dashboard.rewards.sign_success_streak",
                            "Current streak"
                          )
                        }}:
                        <span
                          class="font-semibold text-black dark:text-white"
                          >{{ attendance.currentStreak }}</span
                        >
                        {{ t("dashboard.rewards.days", "Days") }} ·
                        {{ currentMonthName }}
                      </p>
                    </div>
                  </div>
                </section>

                <section
                  class="bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-lg p-6"
                >
                  <div class="flex items-center gap-3 mb-4">
                    <h2
                      class="text-xl font-semibold text-black dark:text-white tracking-tight"
                    >
                      {{
                        t("dashboard.rewards.welcome_bonus", "Welcome Bonus")
                      }}
                    </h2>
                  </div>
                  <p
                    class="text-[13px] text-[#666] dark:text-[#a1a1a1] leading-relaxed"
                    v-html="t('dashboard.rewards.welcome_desc')"
                  ></p>
                </section>

                <section
                  class="bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-lg p-6 md:p-8"
                >
                  <div
                    class="flex flex-col md:flex-row md:items-end justify-between mb-8"
                  >
                    <div>
                      <h2
                        class="text-xl font-semibold text-black dark:text-white tracking-tight mb-4"
                      >
                        {{
                          t(
                            "dashboard.rewards.salary_title",
                            "Attendance Milestone Tracker"
                          )
                        }}
                      </h2>
                      <p
                        class="text-[14px] text-[#666] dark:text-[#a1a1a1] mt-1"
                      >
                        {{
                          t(
                            "dashboard.rewards.salary_desc",
                            "Complete daily assignments to reach your upcoming payout milestones."
                          )
                        }}
                      </p>
                    </div>
                  </div>

                  <div
                    v-if="userData.isCoachAccount"
                    class="mb-6 px-4 py-2.5 rounded-md border flex items-center justify-center gap-2 bg-[#f8fafc] dark:bg-[#0f172a]/50 text-[#64748b] dark:text-[#94a3b8] border-[#e2e8f0] dark:border-[#1e293b]"
                  >
                    <span class="material-icons-round text-[16px]"
                      >visibility</span
                    >
                    <span class="text-[13px] font-medium">{{
                      t(
                        "dashboard.rewards.coach_restricted",
                        "Attendance payouts, membership bonuses and referral program are not applicable to coach accounts."
                      )
                    }}</span>
                  </div>

                  <div
                    :class="{
                      'opacity-40 grayscale pointer-events-none transition-all duration-300':
                        userData.isCoachAccount,
                    }"
                  >
                    <div
                      class="mb-12 w-full bg-[#fafafa] dark:bg-[#111] rounded-lg p-5 border border-black/5 dark:border-white/5"
                    >
                      <div
                        class="flex flex-wrap justify-between items-center text-[13px] font-medium text-[#666] dark:text-[#a1a1a1] mb-5"
                      >
                        <span class="uppercase tracking-wider font-semibold">{{
                          currentMonthName
                        }}</span>
                        <span
                          class="bg-white dark:bg-black px-3 py-1 mt-2 sm:mt-0 rounded-full border border-black/10 dark:border-white/10 text-black dark:text-white shadow-sm"
                        >
                          {{ attendance.currentStreak }} /
                          {{ attendance.totalDays }}
                          {{ t("dashboard.rewards.days", "Days") }}
                        </span>
                      </div>

                      <div
                        class="grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-3 w-full"
                      >
                        <div
                          v-for="day in attendance.totalDays"
                          :key="day"
                          class="h-10 sm:h-12 rounded-md flex flex-col items-center justify-center text-[13px] font-medium relative"
                          :class="[
                            day <= attendance.currentStreak
                              ? 'bg-[#16a34a] text-white shadow-[0_2px_8px_rgba(22,163,74,0.25)] border border-[#16a34a]'
                              : 'bg-white dark:bg-black border border-black/10 dark:border-white/10 text-[#666] dark:text-[#a1a1a1]',
                            attendance.payoutMilestones.includes(day) &&
                            day > attendance.currentStreak
                              ? 'border-[#0070f3] dark:border-[#3291ff] border-dashed text-[#0070f3] dark:text-[#3291ff] bg-[#0070f3]/5 dark:bg-[#3291ff]/5'
                              : '',
                          ]"
                          :title="`Day ${day}`"
                        >
                          <span class="z-10">{{ day }}</span>
                          <div
                            class="absolute bottom-1 flex items-center justify-center gap-1 w-full"
                          >
                            <div
                              v-if="attendance.payoutMilestones.includes(day)"
                              class="w-1 h-1 rounded-full"
                              :class="
                                day <= attendance.currentStreak
                                  ? 'bg-white'
                                  : 'bg-[#0070f3] dark:bg-[#3291ff]'
                              "
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="space-y-3">
                      <p
                        class="text-[12px] font-semibold text-[#666] dark:text-[#a1a1a1] uppercase tracking-wider mb-4"
                      >
                        {{
                          t("dashboard.rewards.milestones", "Payout Timeline")
                        }}
                      </p>

                      <div
                        v-for="(milestone, index) in milestonesList"
                        :key="index"
                        class="flex items-center justify-between p-4 rounded-md border"
                        :class="[
                          milestone.isPerfect
                            ? milestone.status === 'completed'
                              ? 'bg-rose-500/5 border-rose-500/20'
                              : milestone.status === 'active'
                              ? 'bg-rose-500/10 border-rose-500/50 shadow-sm'
                              : 'bg-transparent border-dashed border-rose-500/30 opacity-80'
                            : milestone.status === 'completed'
                            ? 'bg-[#fafafa] dark:bg-[#111] border-black/10 dark:border-white/10'
                            : milestone.status === 'active'
                            ? 'bg-white dark:bg-black border-[#0070f3] dark:border-[#3291ff] shadow-sm'
                            : 'bg-transparent border-dashed border-black/10 dark:border-white/10 opacity-70',
                        ]"
                      >
                        <div class="flex items-center gap-4">
                          <div
                            class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                            :class="
                              milestone.isPerfect
                                ? milestone.status === 'upcoming'
                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-500'
                                  : 'bg-rose-500/20 text-rose-600 dark:text-rose-500'
                                : milestone.status === 'completed'
                                ? 'bg-[#16a34a]/10 text-[#16a34a]'
                                : milestone.status === 'active'
                                ? 'bg-[#0070f3]/10 text-[#0070f3]'
                                : 'bg-[#0070f3]/10 text-[#0070f3] opacity-70'
                            "
                          >
                            <span
                              v-if="milestone.isPerfect"
                              class="material-icons-round text-[16px]"
                              >military_tech</span
                            >
                            <span
                              v-else-if="milestone.status === 'completed'"
                              class="material-icons-round text-[16px]"
                              >check</span
                            >
                            <span
                              v-else-if="milestone.status === 'active'"
                              class="material-icons-round text-[16px]"
                              >arrow_forward</span
                            >
                            <span
                              v-else
                              class="material-icons-round text-[16px]"
                              >schedule</span
                            >
                          </div>
                          <div>
                            <p
                              class="text-[14px] font-medium"
                              :class="
                                milestone.status === 'completed'
                                  ? 'text-black dark:text-white'
                                  : 'text-[#666] dark:text-[#a1a1a1]'
                              "
                            >
                              {{
                                milestone.isPerfect
                                  ? t(
                                      "dashboard.rewards.full_attendance_kpi",
                                      "Full Attendance KPI"
                                    )
                                  : t("dashboard.rewards.milestone_day", {
                                      day: milestone.day,
                                    })
                              }}
                            </p>

                            <p
                              v-if="milestone.status === 'active'"
                              class="text-[12px] font-medium mt-0.5 text-[#666] dark:text-[#a1a1a1]"
                            >
                              {{
                                t(
                                  "dashboard.rewards.next_upcoming",
                                  "Next Upcoming Payout"
                                )
                              }}
                            </p>
                            <p
                              v-else-if="milestone.status === 'completed'"
                              class="text-[12px] text-[#16a34a] font-medium mt-0.5"
                            >
                              {{
                                t(
                                  "dashboard.rewards.credited",
                                  "Credited To Balance"
                                )
                              }}
                            </p>
                            <p
                              v-else-if="milestone.status === 'upcoming'"
                              class="text-[12px] font-medium mt-0.5 text-[#666] dark:text-[#a1a1a1] opacity-70"
                            >
                              {{
                                t("dashboard.rewards.scheduled", "Scheduled")
                              }}
                            </p>
                          </div>
                        </div>
                        <div class="text-right">
                          <p
                            class="text-[14px] font-medium"
                            :class="
                              milestone.status === 'completed'
                                ? 'text-black dark:text-white'
                                : 'text-[#666] dark:text-[#a1a1a1]'
                            "
                          >
                            {{ milestone.amount }}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </template>

            <template v-else-if="activeTab === 'events'">
              <div class="w-full space-y-6">
                <div
                  v-if="userData.isCoachAccount"
                  class="px-4 py-2.5 rounded-md border flex items-center justify-center gap-2 bg-[#f8fafc] dark:bg-[#0f172a]/50 text-[#64748b] dark:text-[#94a3b8] border-[#e2e8f0] dark:border-[#1e293b]"
                >
                  <span class="material-icons-round text-[16px]"
                    >visibility</span
                  >
                  <span class="text-[13px] font-medium">{{
                    t(
                      "dashboard.rewards.coach_restricted",
                      "Attendance payouts, membership bonuses and referral program are not applicable to coach accounts."
                    )
                  }}</span>
                </div>

                <section
                  class="bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-lg p-6"
                >
                  <div
                    class="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-4"
                  >
                    <div>
                      <h2
                        class="text-xl font-semibold text-black dark:text-white tracking-tight mb-1"
                      >
                        {{
                          t(
                            "dashboard.rewards.promotions",
                            "Limited-Time Bonus Events"
                          )
                        }}
                      </h2>
                      <p
                        class="text-[14px] text-[#666] dark:text-[#a1a1a1] font-sans max-w-xl"
                      >
                        {{
                          t(
                            "dashboard.rewards.promo_desc",
                            "Bonus events are special, temporary opportunities that occasionally occur. When active, they appear here for a limited duration to give you a chance to earn exclusive rewards. Check back periodically before they expire!"
                          )
                        }}
                      </p>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      <button
                        @click="prevCertificateImg"
                        :disabled="certificateImg.length <= 1"
                        class="w-7 h-7 rounded-md border border-black/10 dark:border-white/10 flex items-center justify-center text-[#666] hover:bg-[#fafafa] dark:hover:bg-[#111] disabled:opacity-30"
                      >
                        <span class="material-icons-round text-[14px]"
                          >chevron_left</span
                        >
                      </button>

                      <button
                        @click="nextCertificateImg"
                        :disabled="certificateImg.length <= 1"
                        class="w-7 h-7 rounded-md border border-black/10 dark:border-white/10 flex items-center justify-center text-[#666] hover:bg-[#fafafa] dark:hover:bg-[#111] disabled:opacity-30"
                      >
                        <span class="material-icons-round text-[14px]"
                          >chevron_right</span
                        >
                      </button>
                    </div>
                  </div>

                  <div
                    class="relative w-full rounded-md bg-[#fafafa] dark:bg-[#111] overflow-hidden border border-black/10 dark:border-white/10 flex items-center justify-center group mt-4"
                  >
                    <div
                      v-if="postersLoading"
                      class="flex flex-col items-center gap-2 text-[#666] dark:text-[#a1a1a1]"
                    >
                      <span class="material-icons-round animate-spin text-lg"
                        >autorenew</span
                      >
                      <span class="text-[12px] font-medium">{{
                        t(
                          "dashboard.rewards.fetching_promos",
                          "Fetching active promotions..."
                        )
                      }}</span>
                    </div>

                    <div v-if="certificateImg.length" class="grid gap-4">
                      <a
                        :href="certificateImg[currentCertificateIndex]"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          :src="certificateImg[currentCertificateIndex]"
                          alt=""
                          class="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        />
                      </a>
                    </div>
                  </div>
                </section>

                <section
                  class="bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-lg p-6"
                >
                  <div class="mb-6 pb-4">
                    <h2
                      class="text-xl font-semibold text-black dark:text-white tracking-tight mb-1"
                    >
                      {{ t("dashboard.events.title", "Membership Levels") }}
                    </h2>
                    <p
                      class="text-[14px] text-[#666] dark:text-[#a1a1a1] font-sans"
                    >
                      {{
                        t(
                          "dashboard.events.subtitle",
                          "Unlock new tiers, increase your rank, and expand your earning potential."
                        )
                      }}
                    </p>
                  </div>

                  <div
                    v-if="isFetchingMemberships"
                    class="flex flex-col items-center justify-center py-10 gap-2 text-[#666] dark:text-[#a1a1a1]"
                  >
                    <span class="material-icons-round animate-spin text-2xl"
                      >autorenew</span
                    >
                    <span class="text-[12px] font-medium">{{
                      t("dashboard.events.loading", "Loading memberships...")
                    }}</span>
                  </div>

                  <div v-if="membershipLevelsImg.length" class="grid gap-4">
                    <a
                      v-for="(img, index) in membershipLevelsImg"
                      :key="index"
                      :href="img"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        :src="img"
                        alt=""
                        class="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      />
                    </a>
                  </div>

                  <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      v-for="(level, index) in membershipLevels"
                      :key="index"
                      class="flex items-start gap-4 p-5 border border-black/10 dark:border-white/10 bg-[#fafafa] dark:bg-[#111] rounded-lg hover:border-black/20 dark:hover:border-white/20 transition-colors"
                    >
                      <div
                        class="w-16 h-16 rounded-full bg-white dark:bg-black border border-black/10 dark:border-white/10 flex items-center justify-center overflow-hidden bg-cover bg-center shrink-0 shadow-sm"
                        :style="{
                          backgroundImage: `url(${
                            level.image || level.img || ''
                          })`,
                        }"
                      >
                        <span
                          v-if="!level.image && !level.img"
                          class="material-icons-round text-2xl text-[#ccc] dark:text-[#444]"
                          >stars</span
                        >
                      </div>

                      <div class="flex-1 min-w-0">
                        <div
                          class="flex items-center justify-between gap-2 mb-1"
                        >
                          <h3
                            class="text-[15px] font-bold text-black dark:text-white truncate"
                          >
                            {{ level.name }}
                          </h3>
                          <span
                            class="text-[10px] font-bold bg-[#0070f3]/10 text-[#0070f3] dark:bg-[#3291ff]/10 dark:text-[#3291ff] px-2 py-0.5 rounded tracking-wider uppercase border border-[#0070f3]/20 shrink-0"
                          >
                            {{
                              t("dashboard.events.rank", {
                                rank:
                                  level.rank ||
                                  level.level ||
                                  Number(index) + 1,
                              })
                            }}
                          </span>
                        </div>
                        <p
                          class="text-[12px] text-[#666] dark:text-[#a1a1a1] leading-relaxed mt-1.5 line-clamp-3"
                        >
                          {{
                            level.description ||
                            level.desc ||
                            t(
                              "dashboard.events.default_desc",
                              "Continue completing assignments to advance to this tier."
                            )
                          }}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </template>

              <template v-else-if="activeTab === 'assignments'">
                <div class="w-full">
                  
                  <div v-if="assignmentBannerText" class="w-full bg-[#ffcc00] text-black px-5 py-3.5 rounded-md font-medium text-[13px] sm:text-[14px] leading-relaxed shadow-sm mb-6 text-left break-words whitespace-normal">
                    {{ assignmentBannerText }}
                  </div>

                  <div class="mb-6 border-b border-black/10 dark:border-white/10 pb-4">
                    <h2 class="text-xl font-semibold text-black dark:text-white tracking-tight mb-1">
                      {{ t("dashboard.assignments.title", "Active Schema Allocations") }}
                    </h2>
                    <p class="text-[14px] text-[#666] dark:text-[#a1a1a1] font-sans">
                      {{ t("dashboard.assignments.subtitle", "Automated Data Processing & Financial Ledger") }}
                    </p>
                  </div>

                  <div class="flex justify-center mb-8 mt-6 w-full">
                  <div class="h-[410px] w-[410px] max-w-full flex items-center justify-center bg-transparent rounded-full relative">
                  <GlobalRadar 
                    :completed-tasks="maxSchemaQuota - schemaQuota" 
                    :max-tasks="maxSchemaQuota" 
                    :is-muted="schemaQuota <= 0 && !currentSchema && !recentActivity.some(tx => tx.statusCode === 0)"
                    :task-status="globalRadarStatus"
                    :is-special-bonus="isGlobeGolden" 
                  />
                </div>
              </div>

              <div v-if="specialBonusBalance > 0" class="mb-4 p-4 rounded-lg bg-amber-50 dark:bg-[#3d2a00]/40 border border-amber-200 dark:border-amber-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
                
                <div class="flex items-center gap-3 w-full md:w-auto">
                  <div class="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                    <span class="material-icons-round text-xl">card_giftcard</span>
                  </div>
                  <div>
                    <h3 class="text-[14px] font-bold text-amber-900 dark:text-amber-400 flex items-center gap-1.5">
                      ✨ {{ t('dashboard.assignments.bonus_applied', 'Performance Bonus Awarded') }}
                    </h3>
                    <p class="text-[12px] text-amber-700/80 dark:text-amber-500/80 mt-0.5">
                      {{ t('dashboard.assignments.bonus_desc', 'Your special bonus has been added to your grand total.') }}
                    </p>
                  </div>
                </div>
                
                <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 text-[13px] bg-white/60 dark:bg-black/40 px-4 py-3 sm:py-2.5 rounded-md border border-amber-200/50 dark:border-amber-900/30 w-full md:w-auto">
                  
                  <div class="flex flex-row sm:flex-col items-center sm:items-start justify-between w-full sm:w-auto">
                    <span class="text-[10px] uppercase tracking-wider text-amber-700/70 dark:text-amber-500/70 font-semibold">{{ t('dashboard.assignments.ledger_balance', 'Total Ledger Balance') }}</span>
                    <span class="font-sans font-medium text-amber-950 dark:text-amber-100">{{ formatCurrency(coreLedgerBalance) }}</span>
                  </div>
                  
                  <div class="block sm:hidden w-full h-px bg-amber-200/50 dark:bg-amber-900/30"></div>
                  <div class="hidden sm:block w-px h-6 bg-amber-200 dark:bg-amber-900/50"></div>
                  
                  <div class="flex flex-row sm:flex-col items-center sm:items-start justify-between w-full sm:w-auto">
                    <span class="text-[10px] uppercase tracking-wider text-amber-700/70 dark:text-amber-500/70 font-semibold">{{ t('dashboard.assignments.special_bonus', 'Special Bonus') }}</span>
                    <span class="font-sans font-medium text-amber-600 dark:text-amber-400">+{{ formatCurrency(specialBonusBalance) }}</span>
                  </div>
                  
                  <div class="block sm:hidden w-full h-px bg-amber-200/50 dark:bg-amber-900/30"></div>
                  <div class="hidden sm:block w-px h-6 bg-amber-200 dark:bg-amber-900/50"></div>
                  
                  <div class="flex flex-row sm:flex-col items-center sm:items-start justify-between w-full sm:w-auto">
                    <span class="text-[10px] uppercase tracking-wider text-amber-700/70 dark:text-amber-500/70 font-bold">{{ t('dashboard.assignments.grand_total', 'Grand Total') }}</span>
                    <span class="font-sans font-bold text-amber-900 dark:text-amber-300">{{ formatCurrency(grandTotalBalance) }}</span>
                  </div>

                </div>
              </div>
                <div
                  class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 md:gap-8 mb-8 px-1"
                >
                  <div class="flex flex-col justify-between h-full">
                    <div
                      class="flex items-center gap-1.5 mb-2 group relative w-fit cursor-pointer z-20"
                      @click.stop="
                        activeTooltip =
                          activeTooltip === 'ledger' ? null : 'ledger'
                      "
                      v-click-outside="() => (activeTooltip = null)"
                    >
                      <span
                        class="text-[11px] uppercase tracking-wider text-[#666] dark:text-[#a1a1a1] font-semibold font-sans leading-none"
                        >{{
                          t(
                            "dashboard.assignments.ledger_balance",
                            "Total Ledger Balance"
                          )
                        }}</span
                      >
                      <span class="material-icons-round text-[13px] text-[#aaa]"
                        >help_outline</span
                      >

                      <div
                        class="absolute bottom-full left-0 mb-2 w-48 p-2 bg-[#111] dark:bg-white text-white dark:text-black text-[11px] font-medium rounded opacity-0 invisible lg:group-hover:opacity-100 lg:group-hover:visible transition-all z-30 shadow-lg pointer-events-none normal-case tracking-normal"
                        :class="{
                          '!opacity-100 !visible': activeTooltip === 'ledger',
                        }"
                      >
                        {{
                          t(
                            "dashboard.assignments.ledger_desc",
                            "Core operational funds, inclusive of profits."
                          )
                        }}
                      </div>
                    </div>
                    <div class="mt-auto flex items-center h-[28px] md:h-[32px]">
                      <div v-if="isInitialLoad" class="animate-pulse bg-gray-200 dark:bg-[#222] h-6 md:h-8 w-24 md:w-32 rounded"></div>
                      <div v-else class="text-xl md:text-2xl font-sans font-medium text-black dark:text-white">
                        {{ formatCurrency(displayTotalLedgerBalance) }}
                      </div>
                    </div>
                  </div>

                  <div
                    v-if="now_money < 0"
                    class="flex flex-col justify-between h-full"
                  >
                    <div
                      class="flex items-center gap-1.5 mb-2 group relative w-fit cursor-pointer z-20"
                      @click.stop="
                        activeTooltip =
                          activeTooltip === 'outstanding' ? null : 'outstanding'
                      "
                      v-click-outside="() => (activeTooltip = null)"
                    >
                      <span
                        class="text-[11px] uppercase tracking-wider text-[#666] dark:text-[#a1a1a1] font-semibold font-sans leading-none"
                        >{{
                          t(
                            "dashboard.assignments.outstanding",
                            "Outstanding Balance"
                          )
                        }}</span
                      >
                      <span class="material-icons-round text-[13px] text-[#aaa]"
                        >help_outline</span
                      >

                      <div
                        class="absolute bottom-full left-0 mb-2 w-48 p-2 bg-[#111] dark:bg-white text-white dark:text-black text-[11px] font-medium rounded opacity-0 invisible lg:group-hover:opacity-100 lg:group-hover:visible transition-all z-30 shadow-lg pointer-events-none normal-case tracking-normal"
                        :class="{
                          '!opacity-100 !visible':
                            activeTooltip === 'outstanding',
                        }"
                      >
                        {{
                          t(
                            "dashboard.assignments.outstanding_desc",
                            "The funding shortfall required to settle the pending assignment."
                          )
                        }}
                      </div>
                    </div>
                      <div class="mt-auto flex items-center h-[28px] md:h-[32px]">
                        <div v-if="isInitialLoad" class="animate-pulse bg-gray-200 dark:bg-[#222] h-6 md:h-8 w-24 md:w-32 rounded"></div>
                        <div v-else class="text-xl md:text-2xl font-sans font-medium text-black dark:text-white">
                          {{ formatCurrency(outstandingBalance) }}
                        </div>
                      </div>
                  </div>

                  <div class="flex flex-col justify-between h-full">
                    <div
                      class="flex items-center gap-1.5 mb-2 group relative w-fit cursor-pointer z-20"
                      @click.stop="
                        activeTooltip =
                          activeTooltip === 'current' ? null : 'current'
                      "
                      v-click-outside="() => (activeTooltip = null)"
                    >
                      <span
                        class="text-[11px] uppercase tracking-wider text-[#666] dark:text-[#a1a1a1] font-semibold font-sans leading-none"
                        >{{
                          t(
                            "dashboard.assignments.current_balance",
                            "Current Account Value"
                          )
                        }}</span
                      >
                      <span class="material-icons-round text-[13px] text-[#aaa]"
                        >help_outline</span
                      >

                      <div
                        class="absolute bottom-full left-0 mb-2 w-48 p-2 bg-[#111] dark:bg-white text-white dark:text-black text-[11px] font-medium rounded opacity-0 invisible lg:group-hover:opacity-100 lg:group-hover:visible transition-all z-30 shadow-lg pointer-events-none normal-case tracking-normal"
                        :class="{
                          '!opacity-100 !visible': activeTooltip === 'current',
                        }"
                      >
                        {{
                          t(
                            "dashboard.assignments.current_balance_desc",
                            "Total ledger balance projected with the pending active assignment."
                          )
                        }}
                      </div>
                    </div>
                    <div class="mt-auto flex items-center h-[28px] md:h-[32px]">
                      <div v-if="isInitialLoad" class="animate-pulse bg-gray-200 dark:bg-[#222] h-6 md:h-8 w-24 md:w-32 rounded"></div>
                      <div v-else class="text-xl md:text-2xl font-sans font-medium text-black dark:text-white">
                        {{ formatCurrency(displayCurrentBalance) }}
                      </div>
                    </div>
                  </div>

                  <div class="flex flex-col justify-between h-full">
                    <div
                      class="flex items-center gap-1.5 mb-2 group relative w-fit cursor-pointer z-20"
                      @click.stop="
                        activeTooltip =
                          activeTooltip === 'profit' ? null : 'profit'
                      "
                      v-click-outside="() => (activeTooltip = null)"
                    >
                      <span
                        class="text-[11px] uppercase tracking-wider text-[#666] dark:text-[#a1a1a1] font-semibold font-sans leading-none"
                        >{{
                          t(
                            "dashboard.assignments.cycle_profit",
                            "Current Cycle Profit"
                          )
                        }}</span
                      >
                      <span class="material-icons-round text-[13px] text-[#aaa]"
                        >help_outline</span
                      >

                      <div
                        class="absolute bottom-full left-0 mb-2 w-48 p-2 bg-[#111] dark:bg-white text-white dark:text-black text-[11px] font-medium rounded opacity-0 invisible lg:group-hover:opacity-100 lg:group-hover:visible transition-all z-30 shadow-lg pointer-events-none normal-case tracking-normal"
                        :class="{
                          '!opacity-100 !visible': activeTooltip === 'profit',
                        }"
                      >
                        {{
                          t(
                            "dashboard.assignments.cycle_profit_desc",
                            "This calculation updates at the start of each new cycle. All profits are then added to the total ledger balance."
                          )
                        }}
                      </div>
                    </div>
                      <div class="mt-auto flex items-center h-[28px] md:h-[32px]">
                        <div v-if="isInitialLoad" class="animate-pulse bg-gray-200 dark:bg-[#222] h-6 md:h-8 w-24 md:w-32 rounded"></div>
                        <div v-else class="text-xl md:text-2xl font-sans font-medium text-black dark:text-white">
                          {{ formatCurrency(currentCycleProfit) }}
                        </div>
                      </div>
                  </div>

                  <div class="flex flex-col justify-between h-full">
                    <div class="flex items-center gap-1.5 mb-2">
                      <span
                        class="text-[11px] uppercase tracking-wider text-[#666] dark:text-[#a1a1a1] font-semibold font-sans leading-none"
                        >{{
                          t("dashboard.assignments.yield_rate", "Yield Rate")
                        }}</span
                      >
                    </div>
                    <div class="mt-auto flex items-center h-[28px] md:h-[32px]">
                      <div v-if="isInitialLoad" class="animate-pulse bg-gray-200 dark:bg-[#222] h-6 md:h-8 w-16 md:w-24 rounded"></div>
                      <div v-else class="text-xl md:text-2xl font-sans font-medium text-black dark:text-white">
                        {{ reward_rate }} %
                      </div>
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                  <div
                    class="p-6 bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-lg flex flex-col justify-between min-h-[14rem]"
                  >
                      <div>
                      <div class="flex items-center justify-between mb-4">
                        <h3
                          class="text-[15px] font-semibold text-black dark:text-white font-sans"
                        >
                          {{
                            t(
                              "dashboard.assignments.schema_sync",
                              "Schema Synchronization"
                            )
                          }}
                        </h3>
                        <span
                          class="text-[11px] font-medium px-2 py-0.5 rounded bg-[#fafafa] dark:bg-[#111] border border-black/5 dark:border-white/5 text-[#666] dark:text-[#a1a1a1]"
                        >
                          {{
                            t("dashboard.assignments.quota_remaining", {
                              current: schemaQuota,
                              max: maxSchemaQuota,
                            })
                          }}
                        </span>
                      </div>
                      <p
                        class="text-[13px] text-[#666] dark:text-[#a1a1a1] leading-relaxed mb-6"
                      >
                        {{
                          t(
                            "dashboard.assignments.sync_desc",
                            "Establish a secure connection to the allocation pool to sync and inspect the next available structured dataset prior to ledger execution."
                          )
                        }}
                      </p>
                    </div>

                    <div
                      class="mt-auto pt-6 border-t border-black/5 dark:border-white/5"
                    >
                      <button
                        @click="retrieveAssignment('auto')"
                        :disabled="
                          isRetrievingAssignment || currentSchema !== null
                        "
                        class="w-full px-6 py-3 bg-black dark:bg-white text-white dark:text-black text-[13px] font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-transparent"
                      >
                        <span
                          v-if="isRetrievingAssignment"
                          class="material-icons-round animate-spin text-[16px]"
                          >autorenew</span
                        >
                        <span v-else class="material-icons-round text-[16px]"
                          >sync</span
                        >
                        {{
                          isRetrievingAssignment
                            ? t(
                                "dashboard.assignments.syncing",
                                "Syncing Payload..."
                              )
                            : t(
                                "dashboard.assignments.sync_btn",
                                "Sync Next Schema"
                              )
                        }}
                      </button>
                    </div>
                  </div>

                  <div
                    class="lg:col-span-2 relative rounded-lg"
                    :class="isProceeding ? 'p-0.5 z-10' : 'p-px'"
                  >
                    <div
                      v-if="isProceeding"
                      class="absolute inset-0 rounded-lg bg-[linear-gradient(90deg,#ff9a9e,#d4bbf9,#a1c4fd,#bbf0f3,#ff9a9e)] bg-size-[200%_200%] animate-rainbow-glow-spin z-0 filter blur-xs opacity-60"
                    ></div>
                    <div
                      v-if="isProceeding"
                      class="absolute inset-0 rounded-lg bg-[linear-gradient(90deg,#ff9a9e,#d4bbf9,#a1c4fd,#bbf0f3,#ff9a9e)] bg-size-[200%_200%] animate-rainbow-glow-spin z-0"
                    ></div>

                  <div
                    v-if="currentSchema"
                    class="relative p-6 md:p-8 rounded-[calc(0.5rem-1px)] z-10 flex flex-col justify-between min-h-full w-full"
                    :class="[
                        currentSchema.isHighYield
                          ? 'bg-amber-50 dark:bg-[#3d2a00] border-amber-300 dark:border-[#5c4000]'
                          : 'bg-white dark:bg-[#0a0a0a] border-black/10 dark:border-white/10',
                        !isProceeding ? 'border shadow-sm' : '',
                      ]"
                    >
                      <div
                        class="flex flex-col sm:flex-row items-center sm:items-start gap-6 flex-1 w-full"
                      >
                        <img
                          :src="currentSchema.image"
                          class="w-24 h-24 rounded-lg border border-black/10 dark:border-white/10 object-cover shadow-sm bg-[#fafafa] dark:bg-[#111] shrink-0"
                          :alt="
                            t(
                              'dashboard.assignments.product_visual',
                              'Product Visual'
                            )
                          "
                        />

                        <div
                          class="flex-1 w-full grid grid-cols-2 gap-y-5 gap-x-4 text-[13px] pt-1"
                        >
                          <div class="col-span-2">
                            <p
                              class="text-[11px] uppercase tracking-wider text-[#666] dark:text-[#a1a1a1] mb-1 font-semibold"
                            >
                              {{
                                t(
                                  "dashboard.assignments.timestamp_id",
                                  "Timestamp ID"
                                )
                              }}
                            </p>
                            <p class="font-mono text-black dark:text-white">
                              {{ currentSchema.timestamp }}
                            </p>
                          </div>
                        <div class="col-span-2 min-w-0">
                          <p class="text-[11px] uppercase tracking-wider text-[#666] dark:text-[#a1a1a1] mb-1 font-semibold">
                            {{
                              t(
                                "dashboard.assignments.reference",
                                "Reference"
                              )
                            }}
                          </p>
                          <p class="font-mono text-black dark:text-white font-medium break-words whitespace-normal leading-relaxed">
                            {{ currentSchema.reference }}
                          </p>
                        </div>

                          <div>
                            <p
                              class="text-[11px] uppercase tracking-wider text-[#666] dark:text-[#a1a1a1] mb-1 font-semibold">
                              {{
                                t(
                                  "dashboard.assignments.asset_value",
                                  "Asset Value"
                                )
                              }}
                            </p>
                            <p
                              class="font-sans text-black dark:text-white font-bold">
                              {{ formatCurrency(currentSchema.value) }}
                            </p>
                          </div>
                          <div>
                            <p
                              class="text-[11px] uppercase tracking-wider text-[#666] dark:text-[#a1a1a1] mb-1 font-semibold">
                              {{
                                t(
                                  "dashboard.assignments.yield_rate",
                                  "Yield Rate"
                                )
                              }}
                            </p>
                            <p class="font-sans text-black dark:text-white">
                              {{ currentSchema.yieldRate }}%
                            </p>
                          </div>
                          <div class="col-span-2 sm:col-span-1">
                            <p
                              class="text-[11px] uppercase tracking-wider text-[#666] dark:text-[#a1a1a1] mb-1 font-semibold"
                            >
                              {{ t("dashboard.assignments.yield", "Yield") }}
                            </p>
                            <p
                              class="font-sans text-black dark:text-white font-medium"
                            >
                              {{ formatCurrency(currentSchema.yieldImpact) }}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div
                        class="mt-6 pt-5 border-t border-black/5 dark:border-white/5 flex items-center justify-end w-full"
                      >
                        <button
                          @click="proceedToNext"
                          :disabled="isProceeding || now_money < 0"
                          :class="
                            now_money < 0
                              ? 'opacity-50 bg-black dark:bg-white text-white dark:text-black cursor-not-allowed'
                              : 'bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200'
                          "
                          class="w-full px-6 py-3 text-[13px] font-medium rounded-md transition-colors flex items-center justify-center gap-2 border border-transparent"
                        >
                          <span
                            v-if="isProceeding"
                            class="material-icons-round animate-spin text-[16px]"
                            >autorenew</span
                          >
                          {{
                            isProceeding
                              ? t(
                                  "dashboard.assignments.verifying",
                                  "Verifying Ledger..."
                                )
                              : t(
                                  "dashboard.assignments.proceed_btn",
                                  "Proceed to Upload"
                                )
                          }}
                        </button>
                      </div>
                    </div>

                      <div
                        v-else
                        class="relative p-6 bg-white dark:bg-[#0a0a0a] rounded-[calc(0.5rem-1px)] z-10 flex items-center justify-center min-h-[14rem] w-full border border-black/10 dark:border-white/10 border-dashed"
                      >
                      <span class="text-[13px] text-[#888] dark:text-[#666]">{{
                        t(
                          "dashboard.assignments.idle",
                          "Data view idle. Please sync a structural schema."
                        )
                      }}</span>
                    </div>
                  </div>
                </div>

                <div
                  class="bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-lg overflow-hidden w-full"
                >
                  <div
                    class="px-6 py-4 border-b border-black/10 dark:border-white/10 bg-[#fafafa] dark:bg-[#111] flex items-center justify-between"
                  >
                    <h3
                      class="text-[13px] font-semibold text-black dark:text-white font-sans"
                    >
                      {{
                        t(
                          "dashboard.assignments.recent_activity",
                          "Recent Activity"
                        )
                      }}
                    </h3>
                  </div>

                  <div
                    class="block md:hidden divide-y divide-black/5 dark:divide-white/5"
                  >
                    <div
                      v-if="displayedActivity.length === 0"
                      class="p-6 text-center text-[13px] text-[#666]"
                    >
                      {{
                        t(
                          "dashboard.assignments.no_activity",
                          "No recent activity."
                        )
                      }}
                    </div>
                    <div
                      v-for="tx in displayedActivity"
                      :key="tx.id"
                      class="p-4 flex flex-col gap-3"
                      :class="
                        tx.isHighYield
                          ? 'bg-amber-50 dark:bg-[#3d2a00]'
                          : 'bg-transparent'
                      "
                    >
                      <div class="flex items-start justify-between gap-3">
                        <div class="flex flex-col gap-1">
                          <span
                            class="font-mono text-[10px] text-[#888] dark:text-[#777] leading-none"
                            >{{ tx.timestamp }}</span
                          >
                          <span
                            class="font-mono text-[11px] text-[#666] dark:text-[#a1a1a1] break-all whitespace-normal text-left leading-relaxed"
                            >{{ tx.reference }}</span
                          >
                        </div>
                        <span
                          class="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-sm border whitespace-nowrap shrink-0 mt-0.5"
                          :class="{
                            'border-emerald-200 text-emerald-600 bg-emerald-50 dark:border-emerald-900/30 dark:text-emerald-400 dark:bg-emerald-900/10':
                              tx.status === 'Success',
                            'border-gray-200 text-gray-600 bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:bg-gray-800':
                              tx.status === 'Corrupted',
                            'border-yellow-200 text-yellow-600 bg-yellow-50 dark:border-yellow-900/30 dark:text-yellow-400 dark:bg-yellow-900/10':
                              tx.status === 'Pending',
                          }"
                        >
                          {{
                            tx.status === "Success"
                              ? t(
                                  "dashboard.assignments.status_success",
                                  "Success"
                                )
                              : tx.status === "Pending"
                              ? t(
                                  "dashboard.assignments.status_pending",
                                  "Pending"
                                )
                              : tx.status === "Corrupted"
                              ? t(
                                  "dashboard.assignments.status_corrupted",
                                  "Corrupted"
                                )
                              : tx.status
                          }}
                        </span>
                      </div>
                      <div
                        class="flex items-center justify-between text-[13px] font-sans"
                      >
                        <span class="text-black dark:text-white text-left"
                          >{{ t("dashboard.assignments.asset", "Asset") }}:
                          {{ formatCurrency(tx.value) }}</span
                        >
                        <div class="flex items-center gap-3">
                          <span class="text-[#666] dark:text-[#a1a1a1]">{{
                            tx.yieldRate === "-" ? "-" : tx.yieldRate + "%"
                          }}</span>
                          <span
                            class="font-medium text-black dark:text-white"
                            >{{ formatCurrency(tx.amount) }}</span
                          >
                        </div>
                      </div>
                      <button
                        v-if="tx.statusCode === 0"
                        type="button"
                        :disabled="submittingRecordId === tx.txId"
                        @click="submitOrderFromRecord(tx)"
                        class="mt-2 w-full py-2 text-[12px] font-semibold rounded-md border border-[#0070f3] dark:border-[#3291ff] text-[#0070f3] dark:text-[#3291ff] bg-transparent hover:bg-[#0070f3]/10 dark:hover:bg-[#3291ff]/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        <span
                          v-if="submittingRecordId === tx.txId"
                          class="material-icons-round animate-spin text-[14px]"
                          >autorenew</span
                        >
                        {{
                          submittingRecordId === tx.txId
                            ? t("dashboard.modal.processing", "Processing...")
                            : t("dashboard.assignments.submit_order", "Submit")
                        }}
                      </button>
                    </div>
                  </div>

                  <div class="hidden md:block overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                      <thead
                        class="text-[11px] uppercase tracking-wider text-[#666] dark:text-[#a1a1a1] border-b border-black/10 dark:border-white/10 font-sans bg-[#fafafa]/50 dark:bg-[#111]/50"
                      >
                        <tr>
                          <th class="px-6 py-3.5 font-semibold text-left">
                            {{
                              t(
                                "dashboard.assignments.timestamp_id",
                                "Timestamp ID"
                              )
                            }}
                          </th>
                          <th class="px-6 py-3.5 font-semibold text-left w-1/4">
                            {{
                              t("dashboard.assignments.reference", "Reference")
                            }}
                          </th>
                          <th class="px-6 py-3.5 font-semibold text-left">
                            {{
                              t(
                                "dashboard.assignments.asset_value",
                                "Asset Value"
                              )
                            }}
                          </th>
                          <th class="px-6 py-3.5 font-semibold text-left">
                            {{
                              t(
                                "dashboard.assignments.yield_rate",
                                "Yield Rate"
                              )
                            }}
                          </th>
                          <th class="px-6 py-3.5 font-semibold text-left">
                            {{ t("dashboard.assignments.yield", "Yield") }}
                          </th>
                          <th class="px-6 py-3.5 font-semibold text-left">
                            {{ t("dashboard.payouts.th_status", "Status") }}
                          </th>
                          <th class="px-6 py-3.5 font-semibold text-left w-24">
                            {{ t("dashboard.assignments.action", "Action") }}
                          </th>
                        </tr>
                      </thead>
                      <tbody
                        class="divide-y divide-black/5 dark:divide-white/5 text-[13px]"
                      >
                        <tr v-if="displayedActivity.length === 0">
                          <td
                            colspan="7"
                            class="px-6 py-6 text-center text-[#666] dark:text-[#a1a1a1]"
                          >
                            {{
                              t(
                                "dashboard.assignments.no_activity",
                                "No recent activity."
                              )
                            }}
                          </td>
                        </tr>
                        <tr
                          v-for="tx in displayedActivity"
                          :key="tx.id"
                          :class="
                            tx.isHighYield
                              ? 'bg-amber-50 dark:bg-[#3d2a00]'
                              : 'bg-transparent'
                          "
                        >
                          <td
                            class="px-6 py-4 text-[#888] dark:text-[#666] font-mono text-[11px] whitespace-nowrap text-left align-top"
                          >
                            {{ tx.timestamp }}
                          </td>
                          <td
                            class="px-6 py-4 text-[#888] dark:text-[#666] font-mono text-[11px] break-all whitespace-normal min-w-30 max-w-62.5 text-left align-top leading-relaxed"
                          >
                            {{ tx.reference }}
                          </td>
                          <td
                            class="px-6 py-4 text-left text-black dark:text-white font-sans align-top"
                          >
                            {{ formatCurrency(tx.value) }}
                          </td>
                          <td
                            class="px-6 py-4 text-left text-black dark:text-white font-sans align-top"
                          >
                            {{
                              tx.yieldRate === "-" ? "-" : tx.yieldRate + "%"
                            }}
                          </td>
                          <td
                            class="px-6 py-4 text-left text-black dark:text-white font-sans font-medium align-top"
                          >
                            {{ formatCurrency(tx.amount) }}
                          </td>
                          <td class="px-6 py-4 text-left align-top">
                            <span
                              class="px-2 py-1 text-[10px] uppercase tracking-wider font-sans font-semibold rounded-sm border whitespace-nowrap"
                              :class="{
                                'border-emerald-200 text-emerald-600 bg-emerald-50 dark:border-emerald-900/30 dark:text-emerald-400 dark:bg-emerald-900/10':
                                  tx.status === 'Success',
                                'border-gray-200 text-gray-600 bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:bg-gray-800':
                                  tx.status === 'Corrupted',
                                'border-yellow-200 text-yellow-600 bg-yellow-50 dark:border-yellow-900/30 dark:text-yellow-400 dark:bg-yellow-900/10':
                                  tx.status === 'Pending',
                              }"
                            >
                              {{
                                tx.status === "Success"
                                  ? t(
                                      "dashboard.assignments.status_success",
                                      "Success"
                                    )
                                  : tx.status === "Pending"
                                  ? t(
                                      "dashboard.assignments.status_pending",
                                      "Pending"
                                    )
                                  : tx.status === "Corrupted"
                                  ? t(
                                      "dashboard.assignments.status_corrupted",
                                      "Corrupted"
                                    )
                                  : tx.status
                              }}
                            </span>
                          </td>
                          <td class="px-6 py-4 text-left align-top">
                            <button
                              v-if="tx.statusCode === 0"
                              type="button"
                              :disabled="submittingRecordId === tx.txId"
                              @click="submitOrderFromRecord(tx)"
                              class="px-3 py-1.5 text-[11px] font-semibold rounded border border-[#0070f3] dark:border-[#3291ff] text-[#0070f3] dark:text-[#3291ff] bg-transparent hover:bg-[#0070f3]/10 dark:hover:bg-[#3291ff]/10 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1"
                            >
                              <span
                                v-if="submittingRecordId === tx.txId"
                                class="material-icons-round animate-spin text-[12px]"
                                >autorenew</span
                              >
                              {{
                                submittingRecordId === tx.txId
                                  ? t(
                                      "dashboard.modal.processing",
                                      "Processing..."
                                    )
                                  : t(
                                      "dashboard.assignments.submit_order",
                                      "Submit"
                                    )
                              }}
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div
                    v-if="recentActivity.length > 4"
                    class="px-6 py-3 border-t border-black/5 dark:border-white/5 flex items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a]"
                  >
                    <button
                      @click="showAllActivity = !showAllActivity"
                      class="text-[13px] font-medium text-black dark:text-white hover:opacity-70 transition-opacity flex items-center gap-1.5"
                    >
                      {{
                        showAllActivity
                          ? t(
                              "dashboard.assignments.collapse",
                              "Collapse Ledger"
                            )
                          : t(
                              "dashboard.assignments.view_all",
                              "View All Activity"
                            )
                      }}
                      <span class="material-icons-round text-[16px]">{{
                        showAllActivity ? "expand_less" : "expand_more"
                      }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </template>

            <template v-else-if="activeTab === 'payouts'">
              <div class="w-full space-y-6"> 

                <div v-if="payoutBannerText" class="w-full bg-[#ffcc00] text-black px-5 py-3.5 rounded-md font-medium text-[13px] sm:text-[14px] leading-relaxed shadow-sm mb-6 text-left break-words whitespace-normal">
                  {{ payoutBannerText }}
                </div>

                <div class="mb-2">
                  <h2 class="text-xl font-semibold text-black dark:text-white tracking-tight mb-1">
                    {{ t("dashboard.payouts.title", "Manage Payouts") }}
                  </h2>
                  <p class="text-[14px] text-[#666] dark:text-[#a1a1a1] font-sans">
                    {{ t("dashboard.payouts.subtitle", "Set up where to send your funds and request your payout securely.") }}
                  </p>
                </div>

          <div class="bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-lg p-6">
              <div class="flex items-center justify-between mb-5">
                <h3 class="text-[15px] font-semibold text-black dark:text-white">
                  {{ t("dashboard.payouts.funds_breakdown", "Available Funds Breakdown") }}
                </h3>
              </div>

              <div class="space-y-3 font-sans text-[14px]">
                <div class="flex items-center justify-between text-[#666] dark:text-[#a1a1a1]">
                  <span>{{ t("dashboard.assignments.ledger_balance", "Total Ledger Balance") }}</span>
                  <div v-if="isInitialLoad" class="animate-pulse bg-gray-200 dark:bg-[#222] h-5 w-20 rounded"></div>
                  <span v-else class="font-medium text-black dark:text-white">{{ formatCurrency(coreLedgerBalance) }}</span>
                </div>
                
                <div v-if="specialBonusBalance > 0" class="flex items-center justify-between text-[#666] dark:text-[#a1a1a1]">
                  <span class="text-amber-600 dark:text-amber-500">
                    {{ t("dashboard.assignments.special_bonus", "Special Bonus") }}
                  </span>
                  <div v-if="isInitialLoad" class="animate-pulse bg-amber-200/50 dark:bg-amber-900/50 h-5 w-20 rounded"></div>
                  <span v-else class="font-medium text-amber-600 dark:text-amber-500">+ {{ formatCurrency(specialBonusBalance) }}</span>
                </div>

                <div class="pt-4 mt-2 border-t border-black/10 dark:border-white/10 flex items-center justify-between">
                  <span class="text-[14px] text-black dark:text-white">{{ t("dashboard.assignments.grand_total", "Grand Total") }}</span>
                  <div v-if="isInitialLoad" class="animate-pulse bg-gray-200 dark:bg-[#222] h-7 md:h-8 w-28 rounded"></div>
                  <span v-else class="text-xl md:text-2xl font-medium text-black dark:text-white">{{ formatCurrency(grandTotalBalance) }}</span>
                </div>
              </div>
            </div>
              
              <div class="bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-lg p-6">
                <h3 class="text-[15px] font-semibold text-black dark:text-white mb-5 flex items-center gap-2">
                  <span class="w-6 h-6 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center text-[12px]">1</span>
                  {{ t("dashboard.payouts.step1_title", "Send Funds To") }}
                </h3>

                <div class="space-y-5">
                  <div class="relative w-full" v-click-outside="() => (isCountryDropdownOpen = false)">
                    <div @click="isCountryDropdownOpen = !isCountryDropdownOpen" tabindex="0"
                      class="peer w-full p-[14px_16px] text-[14px] min-h-[50px] rounded-md bg-transparent border outline-none z-1 focus:border-2 focus:p-[13px_15px] border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] cursor-pointer flex items-center justify-between transition-all">
                      <span>{{ payoutRegions[withdrawalForm.country]?.label }}</span>
                      <span class="material-icons-round text-[#666] dark:text-[#a1a1a1] text-[18px] transition-transform duration-200" :class="{ 'rotate-180': isCountryDropdownOpen }">expand_more</span>
                    </div>
                    <label class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-white dark:bg-[#0a0a0a] px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left text-[#666] dark:text-[#a1a1a1] peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]">
                      {{ t("dashboard.payouts.bank_country", "Bank Country / Region") }}
                    </label>
                    <transition name="slide-down">
                      <div v-if="isCountryDropdownOpen" class="absolute left-0 top-[calc(100%+4px)] w-full bg-white dark:bg-[#111] border border-black/10 dark:border-white/10 rounded-md shadow-[0_8px_32px_rgba(0,0,0,0.1)] z-50 max-h-60 overflow-y-auto backdrop-blur-xl">
                        <div v-for="region in sortedRegions" :key="region.code" @click="withdrawalForm.country = region.code; isCountryDropdownOpen = false;" class="px-4 py-3 text-[14px] text-black dark:text-white hover:bg-[#fafafa] dark:hover:bg-[#222] cursor-pointer transition-colors" :class="{ 'bg-[#f0f0f0] dark:bg-[#222] font-medium': withdrawalForm.country === region.code }">
                          {{ region.label }}
                        </div>
                      </div>
                    </transition>
                  </div>

                  <div v-if="payoutRegions[withdrawalForm.country].type === 'crypto_only'" class="space-y-4 pt-2">
                    <div class="space-y-2">
                      <label class="text-[13px] font-medium text-[#666] dark:text-[#a1a1a1]">
                        {{ t("dashboard.payouts.available_methods", "Via") }}
                      </label>
                      <div class="grid grid-cols-1 gap-2">
                        <div class="border border-black/5 dark:border-white/5 rounded-md p-3 flex items-start gap-3 bg-[#f5f5f5] dark:bg-[#080808] cursor-not-allowed">
                          <input type="radio" disabled class="mt-0.5 cursor-not-allowed" />
                          <div>
                            <p class="text-[13px] font-medium text-[#888] dark:text-[#666]">{{ payoutRegions[withdrawalForm.country].wireLabel }}</p>
                            <p class="text-[11px] text-[#aaa] dark:text-[#555] mt-0.5 leading-[1.2]">{{ t("dashboard.payouts.unavailable", "Currently unavailable") }}</p>
                          </div>
                        </div>
                        <div class="border border-[#0070f3] dark:border-[#3291ff] rounded-md p-3 flex items-start gap-3 bg-[#0070f3]/5 dark:bg-[#3291ff]/5">
                          <input type="radio" checked readonly class="mt-0.5 accent-[#0070f3]" />
                          <div>
                            <p class="text-[13px] font-medium text-black dark:text-white">{{ t("dashboard.payouts.tokenized", "Tokenized Asset") }}</p>
                            <p class="text-[11px] text-[#0070f3] dark:text-[#3291ff] mt-0.5 leading-[1.2]">{{ t("dashboard.payouts.manual_config", "Manual network configuration") }}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="relative w-full mt-4" v-click-outside="() => (isTokenDropdownOpen = false)">
                      <div @click="!savedWallet.isSaved && (isTokenDropdownOpen = !isTokenDropdownOpen)" tabindex="0" class="peer w-full p-[10px_16px] min-h-[50px] rounded-md outline-none z-1 focus:border-2 focus:p-[9px_15px] flex items-center justify-between transition-[border-color,box-shadow] duration-200 ease-in-out" :class="savedWallet.isSaved ? 'opacity-70 cursor-not-allowed bg-[#f5f5f5] dark:bg-[#111] text-[#888] dark:text-[#666] border border-black/10 dark:border-white/10' : 'bg-transparent border border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] cursor-pointer'">
                        <div v-if="selectedTokenDetails" class="flex items-center gap-3" :class="savedWallet.isSaved ? 'opacity-80 grayscale-[20%]' : ''">
                          <img :src="selectedTokenDetails.icon" class="w-6 h-6 object-contain drop-shadow-sm" :alt="selectedTokenDetails.name" />
                          <div class="flex flex-col leading-none">
                            <span class="text-[14px] font-medium" :class="savedWallet.isSaved ? 'text-[#888] dark:text-[#666]' : ''">{{ selectedTokenDetails.name }}</span>
                            <span class="text-[11px] text-[#666] dark:text-[#a1a1a1] mt-0.5">{{ selectedTokenDetails.networkText }}</span>
                          </div>
                        </div>
                        <span v-else class="text-transparent">{{ t("dashboard.payouts.select_token", "Select Token") }}</span>
                        <span class="material-icons-round text-[#666] dark:text-[#a1a1a1] text-[18px] transition-transform duration-200" :class="{ 'rotate-180': isTokenDropdownOpen }">expand_more</span>
                      </div>
                      <label :class="['absolute left-3 px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left transition-[top,transform,scale] duration-200 ease-in-out', isTokenDropdownOpen || withdrawalForm.token ? 'top-0 -translate-y-1/2 scale-75 text-[#666] dark:text-[#a1a1a1] peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]' : 'top-1/2 -translate-y-1/2 scale-100 text-[#666] dark:text-[#a1a1a1] peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]', savedWallet.isSaved ? 'bg-gradient-to-b from-white to-[#f5f5f5] dark:from-[#0a0a0a] dark:to-[#111]' : 'bg-white dark:bg-[#0a0a0a]']">
                        {{ t("dashboard.payouts.token", "Token") }}
                      </label>
                      <transition name="slide-down">
                        <div v-if="isTokenDropdownOpen" class="absolute left-0 top-[calc(100%+4px)] w-full bg-white dark:bg-[#111] border border-black/10 dark:border-white/10 rounded-md shadow-[0_8px_32px_rgba(0,0,0,0.1)] z-50 overflow-hidden backdrop-blur-xl">
                          <div v-for="token in cryptoOptions" :key="token.value" @click="withdrawalForm.token = token.value; isTokenDropdownOpen = false;" class="px-4 py-3 flex items-center gap-3 hover:bg-[#fafafa] dark:hover:bg-[#222] cursor-pointer transition-colors border-b border-black/5 dark:border-white/5 last:border-none" :class="{ 'bg-[#f0f0f0] dark:bg-[#222]': withdrawalForm.token === token.value }">
                            <img :src="token.icon" class="w-7 h-7 object-contain drop-shadow-sm" :alt="token.name" />
                            <div class="flex flex-col leading-tight"><span class="text-[14px] text-black dark:text-white font-medium">{{ token.name }}</span><span class="text-[11px] text-[#666] dark:text-[#a1a1a1] mt-0.5">{{ token.networkText }}</span></div>
                          </div>
                        </div>
                      </transition>
                    </div>

                    <div class="mt-4">
                      <div class="relative w-full">
                        <input @keydown.space.prevent v-model="displayedDestination" type="text" placeholder=" " :readonly="savedWallet.isSaved" class="peer w-full p-[14px_16px] text-[14px] rounded-md outline-none z-1 focus:border-2 focus:p-[13px_15px] transition-[border-color,box-shadow] duration-200 ease-in-out" :class="[savedWallet.isSaved ? 'opacity-70 cursor-not-allowed bg-[#f5f5f5] dark:bg-[#111] text-[#888] dark:text-[#666] border border-black/10 dark:border-white/10' : 'bg-transparent border border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20', withdrawalForm.destination && walletAddressError && !savedWallet.isSaved ? '!border-[#d32f2f] !text-[#d32f2f] focus:!border-[#d32f2f] placeholder-shown:!border-[#d32f2f]' : '']" />
                        <label class="absolute left-3 top-0 -translate-y-1/2 scale-75 px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left transition-[top,transform,scale] duration-200 ease-in-out peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100" :class="[savedWallet.isSaved ? 'text-[#888] dark:text-[#666] bg-gradient-to-b from-white to-[#f5f5f5] dark:from-[#0a0a0a] dark:to-[#111]' : withdrawalForm.destination && walletAddressError ? 'text-[#d32f2f] peer-focus:text-[#d32f2f] peer-placeholder-shown:text-[#d32f2f] bg-white dark:bg-[#0a0a0a]' : 'text-[#666] dark:text-[#a1a1a1] peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff] bg-white dark:bg-[#0a0a0a]']">
                          {{ t("dashboard.payouts.wallet_address", "Wallet Address") }}
                        </label>
                      </div>
                      <div v-if="withdrawalForm.destination && walletAddressError" class="text-[#d32f2f] text-xs font-medium mt-1 ml-1 flex items-center gap-1">
                        <span class="material-icons-round text-[1em] leading-none" style="font-size: inherit">error</span>
                        <span>{{ walletAddressError }}</span>
                      </div>
                    </div>

                  </div> 
                  
                  <template v-else-if="payoutRegions[withdrawalForm.country].type === 'bank'">
                    <div class="pt-4 space-y-4">
                      <div v-for="field in payoutRegions[withdrawalForm.country].fields" :key="field.key" class="w-full">
                        <div class="relative w-full">
                          <input v-model="withdrawalForm.bankDetails[field.key]" type="text" placeholder=" " class="peer w-full p-[14px_16px] text-[14px] rounded-md bg-transparent border outline-none z-1 focus:border-2 focus:p-[13px_15px] border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20" />
                          <label class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-white dark:bg-[#0a0a0a] px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left transition-[top,transform,scale] duration-200 ease-in-out text-[#666] dark:text-[#a1a1a1] peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]">
                            {{ field.label }}
                          </label>
                        </div>
                        <p class="text-[11px] text-[#666] dark:text-[#a1a1a1] mt-1 ml-1">{{ field.placeholder }}</p>
                      </div>
                    </div>
                  </template>

                <div class="mt-4">
                  <div class="relative w-full">
                    <input v-model="withdrawalForm.accountName" type="text" placeholder=" " :readonly="savedWallet.isSaved && payoutRegions[withdrawalForm.country].type === 'crypto_only'" class="peer w-full p-[14px_16px] text-[14px] rounded-md outline-none z-1 focus:border-2 focus:p-[13px_15px] transition-[border-color,box-shadow] duration-200 ease-in-out" :class="[savedWallet.isSaved && payoutRegions[withdrawalForm.country].type === 'crypto_only' ? 'opacity-70 cursor-not-allowed bg-[#f5f5f5] dark:bg-[#111] text-[#888] dark:text-[#666] border border-black/10 dark:border-white/10' : 'bg-transparent border border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20', showPayoutErrors && !withdrawalForm.accountName.trim() ? '!border-[#d32f2f] !text-[#d32f2f] focus:!border-[#d32f2f] placeholder-shown:!border-[#d32f2f]' : '']" />
                    <label class="absolute left-3 top-0 -translate-y-1/2 scale-75 px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left transition-[top,transform,scale] duration-200 ease-in-out peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100" :class="[savedWallet.isSaved && payoutRegions[withdrawalForm.country].type === 'crypto_only' ? 'text-[#888] dark:text-[#666] bg-gradient-to-b from-white to-[#f5f5f5] dark:from-[#0a0a0a] dark:to-[#111]' : showPayoutErrors && !withdrawalForm.accountName.trim() ? 'text-[#d32f2f] peer-focus:text-[#d32f2f] peer-placeholder-shown:text-[#d32f2f] bg-white dark:bg-[#0a0a0a]' : 'text-[#666] dark:text-[#a1a1a1] peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff] bg-white dark:bg-[#0a0a0a]']">
                      {{ t("dashboard.payouts.account_name", "Account Holder Name") }}
                    </label>
                  </div>
                  <div v-if="showPayoutErrors && !withdrawalForm.accountName.trim()" class="text-[#d32f2f] text-xs font-medium mt-1 ml-1 flex items-center gap-1">
                    <span class="material-icons-round text-[1em] leading-none" style="font-size: inherit">error</span>
                    <span>{{ t("dashboard.payouts.name_required", "Account holder name is required.") }}</span>
                  </div>
                </div>

                  <template v-if="payoutRegions[withdrawalForm.country].type === 'crypto_only'">
                    <div class="pt-4 border-t border-black/5 dark:border-white/5">
                      <button v-if="!savedWallet.isSaved" @click="saveWalletAddress" :disabled="isSavingWallet || !withdrawalForm.token || !withdrawalForm.destination" class="w-full bg-[#f0f0f0] text-black dark:bg-[#222] dark:text-white px-4 py-3 rounded-md text-[13px] font-semibold border border-transparent disabled:opacity-50 hover:bg-[#e0e0e0] dark:hover:bg-[#333] transition-colors flex items-center justify-center gap-2">
                        <span v-if="isSavingWallet" class="material-icons-round animate-spin text-[16px]">autorenew</span>
                        <span v-else class="material-icons-round text-[16px]">save</span>
                        {{ isSavingWallet ? t("dashboard.payouts.saving", "Saving...") : t("dashboard.payouts.save_address", "Save Address") }}
                      </button>

                      <button v-else @click="editWalletAddress" class="w-full bg-transparent text-black dark:text-white border border-black/20 dark:border-white/20 px-4 py-3 rounded-md text-[13px] font-semibold hover:bg-[#fafafa] dark:hover:bg-[#111] flex items-center justify-center gap-2 transition-colors">
                        <span class="material-icons-round text-[16px]">edit</span>
                        {{ t("dashboard.payouts.edit_address", "Edit Address") }}
                      </button>
                    </div>
                  </template>
                </div>
              </div>

                <div class="bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-lg p-6"
                  :class="!isDestinationReady ? 'opacity-50 grayscale-[30%] pointer-events-none' : 'opacity-100'">
                
                <div class="flex items-center justify-between mb-5">
                  <h3 class="text-[15px] font-semibold text-black dark:text-white flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full flex items-center justify-center text-[12px]" :class="!isDestinationReady ? 'bg-gray-300 text-gray-600 dark:bg-gray-800 dark:text-gray-400' : 'bg-black text-white dark:bg-white dark:text-black'">2</span>
                    {{ t("dashboard.payouts.step2_title", "Submit Payout") }}
                  </h3>
                <span v-if="!isDestinationReady" class="text-[11px] text-[#0070f3] dark:text-[#3291ff] font-medium flex items-center gap-1">
                  {{ t("dashboard.payouts.lock_hint", "Please save your address above to proceed.") }}
                </span>
                </div>

                <div class="space-y-5">
                  <div class="relative w-full">
                    <input @keydown.space.prevent :value="withdrawalForm.amount" @input="handleAmountInput" type="text" inputmode="decimal" placeholder=" " class="peer w-full p-[14px_16px] text-[14px] rounded-md bg-transparent border outline-none z-1 focus:border-2 focus:p-[13px_15px] border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20" />
                    <label class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-white dark:bg-[#0a0a0a] px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left transition-[top,transform,scale] duration-200 ease-in-out text-[#666] dark:text-[#a1a1a1] peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]">
                      {{ t("dashboard.payouts.amount", "Amount") }}
                    </label>
                  </div>

                  <div class="relative w-full">
                    <input @keydown.space.prevent v-model="withdrawalForm.passphrase" :type="passwordVisible.withdrawal ? 'text' : 'password'" placeholder=" " class="peer w-full p-[14px_16px] pr-12 text-[14px] rounded-md bg-transparent border outline-none z-1 focus:border-2 focus:p-[13px_15px] focus:pr-11.75 border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20" />
                    <label class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-white dark:bg-[#0a0a0a] px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left transition-[top,transform,scale] duration-200 ease-in-out text-[#666] dark:text-[#a1a1a1] peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]">
                      {{ t("dashboard.payouts.passphrase", "Payout Passphrase") }}
                    </label>
                    <button @click="togglePasswordVisible('withdrawal')" type="button" class="absolute right-4 top-0 bottom-0 my-auto flex items-center justify-center text-[#999] hover:text-black dark:text-[#666] dark:hover:text-white transition-colors z-10" tabindex="-1">
                      <span class="material-icons-round text-[20px]">{{ passwordVisible.withdrawal ? "visibility_off" : "visibility" }}</span>
                    </button>
                  </div>

                  <div class="pt-4 border-t border-black/5 dark:border-white/5">
                    <button @click="requestPayout" :disabled="isRequestingPayout || !withdrawalForm.amount || !withdrawalForm.passphrase" class="w-full bg-black text-white dark:bg-white dark:text-black px-4 py-2.5 rounded-md text-[13px] font-medium border border-transparent disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 dark:hover:bg-gray-200 flex items-center justify-center gap-2">
                      <span v-if="isRequestingPayout" class="material-icons-round animate-spin text-[16px]">autorenew</span>
                      {{ isRequestingPayout ? t("dashboard.payouts.processing", "Processing...") : t("dashboard.payouts.withdraw_btn", "Request Payout") }}
                    </button>
                  </div>
                </div>
              </div>

              <div class="bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-lg p-6">
                <h3 class="text-[15px] font-semibold text-black dark:text-white mb-4">
                  {{ t("dashboard.payouts.history_title", "Recent Transactions") }}
                </h3>
                <div class="block md:hidden divide-y divide-black/5 dark:divide-white/5 border-t border-black/5 dark:border-white/5 mt-2">
                  
                  <div v-for="tx in payoutTransactions" :key="tx.id" class="py-4 flex items-center justify-between gap-3">
                    <div class="flex flex-col gap-1">
                      <span class="font-medium text-black dark:text-white text-[13px] leading-tight">
                        {{ t("dashboard.payouts.default_desc", "Payout") }}
                      </span>
                      <span class="font-mono text-[11px] text-[#888] dark:text-[#666] leading-none">
                        {{ tx.timestamp }}
                      </span>
                    </div>
                    
                    <div class="flex flex-col items-end gap-1.5">
                      <span class="font-semibold text-black dark:text-white text-[14px]">
                        -{{ formatCurrency(tx.amount) }}
                      </span>
                      <span v-if="tx.status === 'Success' || tx.status === 'Approved'" class="px-2 py-0.5 text-[10px] uppercase font-semibold rounded-sm border border-emerald-200 text-emerald-600 bg-emerald-50 dark:border-emerald-900/30 dark:text-emerald-400 dark:bg-emerald-900/10">
                        {{ t("dashboard.payouts.status_success", "Success") }}
                      </span>
                      <span v-else-if="tx.status === 'Pending'" class="px-2 py-0.5 text-[10px] uppercase font-semibold rounded-sm border border-yellow-200 text-yellow-600 bg-yellow-50 dark:border-yellow-900/30 dark:text-yellow-400 dark:bg-yellow-900/10">
                        {{ t("dashboard.payouts.status_pending", "Pending") }}
                      </span>
                      <span v-else-if="tx.status === 'Declined' || tx.status === 'Rejected'" class="px-2 py-0.5 text-[10px] uppercase font-semibold rounded-sm border border-red-200 text-red-600 bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:bg-red-900/10">
                        {{ t("dashboard.payouts.status_declined", "Declined") }}
                      </span>
                    <span v-else class="px-2 py-0.5 text-[10px] uppercase font-semibold rounded-sm border border-gray-200 text-gray-600 bg-gray-50">
                        {{ tx.status }}
                      </span>
                    </div>
                  </div>

                  <div class="py-4 flex items-center justify-between gap-3">
                    <div class="flex flex-col gap-1">
                      <span class="font-medium text-black dark:text-white text-[13px] leading-tight">
                        {{ t("dashboard.payouts.welcome_bonus_desc", "Welcome Bonus") }}
                      </span>
                      <span class="font-mono text-[11px] text-[#888] dark:text-[#666] leading-none">
                        {{ welcomeBonusTimestamp }}
                      </span>
                    </div>
                    <div class="flex flex-col items-end gap-1.5">
                      <span class="font-semibold text-black dark:text-white text-[14px]">
                        +{{ formatCurrency(20) }}
                      </span>
                      <span class="px-2 py-0.5 text-[10px] uppercase font-semibold rounded-sm border border-emerald-200 text-emerald-600 bg-emerald-50 dark:border-emerald-900/30 dark:text-emerald-400 dark:bg-emerald-900/10">
                        {{ t("dashboard.payouts.status_success", "Success") }}
                      </span>
                    </div>
                  </div>

                </div>
                
                <div class="hidden md:block border border-black/10 dark:border-white/10 rounded-md overflow-hidden overflow-x-auto mt-4">
                  <table class="w-full min-w-125 text-left border-collapse">
                    <thead>
                      <tr class="bg-[#fafafa] dark:bg-[#111] border-b border-black/10 dark:border-white/10 text-[12px] text-[#666] dark:text-[#a1a1a1]">
                        <th class="py-2.5 px-4 font-medium">{{ t("dashboard.payouts.th_date", "Timestamp ID") }}</th>
                        <th class="py-2.5 px-4 font-medium">{{ t("dashboard.payouts.th_method", "Description") }}</th>
                        <th class="py-2.5 px-4 font-medium">{{ t("dashboard.payouts.th_amount", "Amount") }}</th>
                        <th class="py-2.5 px-4 font-medium">{{ t("dashboard.payouts.th_status", "Status") }}</th>
                      </tr>
                    </thead>
                    <tbody class="text-[13px]">
                      <tr v-for="tx in payoutTransactions" :key="tx.id" class="border-b border-black/5 dark:border-white/5 hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a]">
                        <td class="py-3 px-4 text-[#666] font-mono text-[11px]">{{ tx.timestamp }}</td>
                        <td class="py-3 px-4 text-black dark:text-white">{{ t("dashboard.payouts.default_desc", "Payout") }}</td>
                        <td class="py-3 px-4 font-medium">-{{ formatCurrency(tx.amount) }}</td>
                        <td class="py-3 px-4">
                          <span v-if="tx.status === 'Success' || tx.status === 'Approved'" class="px-2 py-1 text-[10px] uppercase font-semibold rounded-sm border border-emerald-200 text-emerald-600 bg-emerald-50 dark:border-emerald-900/30 dark:text-emerald-400 dark:bg-emerald-900/10">{{ t("dashboard.payouts.status_success", "Success") }}</span>
                          <span v-else-if="tx.status === 'Pending'" class="px-2 py-1 text-[10px] uppercase font-semibold rounded-sm border border-yellow-200 text-yellow-600 bg-yellow-50 dark:border-yellow-900/30 dark:text-yellow-400 dark:bg-yellow-900/10">{{ t("dashboard.payouts.status_pending", "Pending") }}</span>
                          <span v-else-if="tx.status === 'Declined' || tx.status === 'Rejected'" class="px-2 py-1 text-[10px] uppercase font-semibold rounded-sm border border-red-200 text-red-600 bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:bg-red-900/10">{{ t("dashboard.payouts.status_declined", "Declined") }}</span>
                      <span v-else class="px-2 py-1 text-[10px] uppercase font-semibold rounded-sm border border-gray-200 text-gray-600 bg-gray-50">{{ tx.status }}</span>
                        </td>
                      </tr>

                      <tr class="hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a]">
                        <td class="py-3 px-4 text-[#666] dark:text-[#a1a1a1] whitespace-nowrap font-mono text-[11px]">{{ welcomeBonusTimestamp }}</td>
                        <td class="py-3 px-4 text-black dark:text-white">{{ t("dashboard.payouts.welcome_bonus_desc", "Welcome Bonus") }}</td>
                        <td class="py-3 px-4 text-black dark:text-white font-medium">+{{ formatCurrency(20) }}</td>
                        <td class="py-3 px-4"><span class="px-2 py-1 text-[10px] uppercase font-semibold rounded-sm border border-emerald-200 text-emerald-600 bg-emerald-50 dark:border-emerald-900/30 dark:text-emerald-400 dark:bg-emerald-900/10">{{ t("dashboard.payouts.status_success", "Success") }}</span></td>
                      </tr>

                    </tbody>
                  
                  </table>
                </div>
              </div>

            </div>
          </template>

            <template v-else-if="['terms', 'privacy', 'cookies', 'legal', 'faq'].includes(activeTab as string)"
            >
              <div class="bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-lg p-8 w-full">
                <div
                  class="prose dark:prose-invert max-w-none text-[14px] text-[#444] dark:text-[#ccc] leading-relaxed space-y-6"
                >
                  <template v-if="activeTab === 'terms'">
                    <h2
                      class="text-xl font-semibold text-black dark:text-white mb-4"
                    >
                      {{ t("terms.tos.title") }}
                    </h2>
                    <span
                      class="text-[#666] dark:text-[#a1a1a1] text-[0.9rem] mb-6 block"
                      >{{ t("terms.tos.last_updated") }}</span
                    >
                    <div
                      class="w-full wrap-break-word"
                      v-html="t('terms.tos.content')"
                    ></div>
                  </template>

                  <template v-else-if="activeTab === 'privacy'">
                    <h2
                      class="text-xl font-semibold text-black dark:text-white mb-4"
                    >
                      {{ t("terms.privacy.title") }}
                    </h2>
                    <span
                      class="text-[#666] dark:text-[#a1a1a1] text-[0.9rem] mb-6 block"
                      >{{ t("terms.privacy.last_updated") }}</span
                    >
                    <div
                      class="w-full wrap-break-word"
                      v-html="t('terms.privacy.content')"
                    ></div>
                  </template>

                  <template v-else-if="activeTab === 'cookies'">
                    <h2
                      class="text-xl font-semibold text-black dark:text-white mb-4"
                    >
                      {{ t("terms.cookies.title") }}
                    </h2>
                    <span
                      class="text-[#666] dark:text-[#a1a1a1] text-[0.9rem] mb-6 block"
                      >{{ t("terms.cookies.last_updated") }}</span
                    >
                    <div
                      class="w-full wrap-break-word"
                      v-html="t('terms.cookies.content')"
                    ></div>
                  </template>

                  <template v-else-if="activeTab === 'legal'">
                    <h2
                      class="text-xl font-semibold text-black dark:text-white mb-4"
                    >
                      {{ t("terms.registration.title") }}
                    </h2>
                    <div
                      class="w-full wrap-break-word mb-10"
                      v-html="t('terms.registration.content')"
                    ></div>
                    <div v-if="certificateImg.length" class="grid gap-4">
                      <a
                        v-for="(img, index) in certificateImg"
                        :key="index"
                        :href="img"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          :src="img"
                          alt=""
                          class="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        />
                      </a>
                    </div>

                    <!-- Certificate 富文本 HTML 展示 -->
                    <!-- <div v-if="certificateHtml"
									class="certificate-richtext w-full wrap-break-word text-[#333] dark:text-[#ccc] text-[15px] leading-relaxed mt-8 border-t border-black/10 dark:border-white/10 pt-8"
									v-html="certificateHtml"></div>

								<div v-if="backendImages.length > 0"
									class="mt-12 border-t border-black/10 dark:border-white/10 pt-8">
									<div class="flex flex-wrap gap-5">
										<a v-for="(img, index) in backendImages" :key="img.id || index" :href="img.url"
											target="_blank"
											class="block w-full md:w-[calc(50%-10px)] relative group cursor-pointer">
											<img :src="img.url"
												:alt="t('terms.registration.certificate', 'Certificate')"
												class="w-full h-auto rounded-lg border border-black/10 dark:border-white/10"
												loading="lazy" />
											<div
												class="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg">
												<span
													class="material-icons-round text-white text-3xl drop-shadow-md">open_in_new</span>
											</div>
										</a>
									</div>
								</div> -->
                  </template>

                  <template v-else-if="activeTab === 'faq'">
                    <h2
                      class="text-xl font-semibold text-black dark:text-white mb-6"
                    >
                      {{ ui.sidebar.faq }}
                    </h2>
                    <FaqAccordion />
                  </template>
                </div>
              </div>
            </template>
          </div>
        </Transition>
      </div>

    </div> <div
        v-if="showGiftModal"
        class="fixed inset-0 z-[99] bg-black/80 flex flex-col items-center justify-start sm:justify-center p-4 overflow-y-auto"
        @click.self="
          showGiftModal = false;
          showConfetti = false;
        "
      >
        <div
          class="relative w-full max-w-sm flex flex-col items-center justify-center animate-slide-up my-auto py-8"
        >

          <div
            class="absolute w-64 h-64 bg-[#ffcc00] rounded-full blur-[80px] opacity-20 pointer-events-none"
          ></div>

          <span
            class="absolute top-4 left-16 text-[#ffdf73] text-lg animate-pulse"
            >✦</span
          >
          <span
            class="absolute top-12 right-12 text-[#ffdf73] text-sm animate-pulse delay-75"
            >✦</span
          >
          <span
            class="absolute bottom-24 left-10 text-[#ffdf73] text-xl animate-pulse delay-150"
            >✦</span
          >

          <div class="relative z-10 flex flex-col items-center justify-center mb-6 mt-4">
            <span
              class="material-icons-round text-[140px] text-transparent bg-clip-text bg-gradient-to-b from-[#ffdf73] to-[#d4af37] drop-shadow-[0_0_25px_rgba(255,223,115,0.7)]"
              style="line-height: 1"
            >
              card_giftcard
            </span>
          </div>

          <div
            class="z-10 flex flex-col items-center text-center space-y-3 mb-8 px-4"
          >
            <p
              class="text-[#ffdf73] font-bold text-2xl drop-shadow-[0_0_10px_rgba(255,223,115,0.8)]"
            >
              {{ t("dashboard.modal.funds_received") }}
            </p>
            <p
              class="text-[#fceabb] font-semibold text-[14px] tracking-wide drop-shadow-md leading-relaxed"
            >
              {{
                t("dashboard.modal.funds_received_msg", {
                  amount: giftModalAmount,
                })
              }}
            </p>
          </div>

          <button
            @click="
              showGiftModal = false;
              showConfetti = false;
            "
            class="z-10 bg-[#ebd5b3] text-[#4a3300] px-14 py-2.5 rounded-md font-bold text-[15px] shadow-[0_4px_15px_rgba(0,0,0,0.5)] hover:bg-[#f5e4c6] transition-colors active:scale-95"
          >
            {{ t("auth.session_ok") }}
          </button>
        </div>
      </div>
      <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <div
              v-if="payoutConfirmModal.show"
              class="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
              @click.self="closePayoutModal"
            >
              <Transition
                enter-active-class="transition duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                enter-from-class="opacity-0 scale-90 translate-y-4"
                enter-to-class="opacity-100 scale-100 translate-y-0"
                leave-active-class="transition duration-150 ease-in"
                leave-from-class="opacity-100 scale-100 translate-y-0"
                leave-to-class="opacity-0 scale-90 translate-y-4"
              >
              <div v-if="payoutConfirmModal.show" class="bg-white dark:bg-[#111] border border-black/10 dark:border-white/10 rounded-lg w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                  
                  <div class="px-6 py-5 border-b border-black/10 dark:border-white/10 flex items-center gap-3 shrink-0">
                    <div class="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-500 flex items-center justify-center shrink-0">
                      <span class="material-icons-round text-[22px]">priority_high</span>
                    </div>
                    <div>
                      <h3 class="text-[16px] font-semibold text-black dark:text-white leading-tight">
                        {{ t('dashboard.payouts.confirm_title', 'Confirm Payout Details') }}
                      </h3>
                      <p class="text-[12px] text-[#666] dark:text-[#a1a1a1] mt-0.5">
                        {{ t('dashboard.payouts.review_desc', 'Please review your destination details carefully.') }}
                      </p>
                    </div>
                  </div>
                  
                  <div class="p-6 space-y-5 overflow-y-auto flex-1">
                    <div class="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-md">
                      <p class="text-[13px] text-red-800 dark:text-red-400 leading-relaxed font-medium">
                        {{ t('dashboard.payouts.disclaimer', 'By proceeding, I confirm that the details provided below are strictly accurate and that the receiving account/wallet belongs entirely to me. I acknowledge that transactions are final and cannot be reversed once processed.') }}
                      </p>
                    </div>

                    <div class="space-y-3 bg-[#fafafa] dark:bg-[#0a0a0a] border border-black/5 dark:border-white/5 rounded-md p-4 text-[13px]">
                      <div class="flex items-center justify-between">
                        <span class="text-[#666] dark:text-[#a1a1a1]">{{ t('dashboard.payouts.amount', 'Amount') }}:</span>
                        <span class="font-bold text-black dark:text-white">{{ formatCurrency(payoutConfirmModal.amount) }}</span>
                      </div>
                    <div class="flex items-center justify-between">
                      <span class="text-[#666] dark:text-[#a1a1a1]">{{ t('dashboard.payouts.account_name', 'Account Name') }}:</span>
                      <span class="font-medium text-black dark:text-white text-right break-words max-w-[65%]">{{ payoutConfirmModal.accountName }}</span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-[#666] dark:text-[#a1a1a1]">{{ t('dashboard.payouts.method', 'Method/Token') }}:</span>
                      <div class="flex items-center gap-1.5 justify-end max-w-[65%]">
                        <img v-if="payoutConfirmModal.icon" :src="payoutConfirmModal.icon" class="w-4 h-4 object-contain shrink-0" />
                        <span class="font-medium text-black dark:text-white text-right break-words">{{ payoutConfirmModal.method }}</span>
                      </div>
                    </div>
                      <div class="flex items-center justify-between pt-3 border-t border-black/5 dark:border-white/5">
                        <span class="text-[#666] dark:text-[#a1a1a1]">{{ t('dashboard.payouts.destination', 'Destination') }}:</span>
                        <span class="font-mono font-medium text-black dark:text-white">{{ payoutConfirmModal.destination }}</span>
                      </div>
                    </div>
                  </div>

                    <div class="px-6 py-4 border-t border-black/10 dark:border-white/10 bg-[#fafafa] dark:bg-[#0a0a0a] flex flex-col sm:flex-row items-center justify-end gap-3 shrink-0">
                    <button
                      @click="closePayoutModal"
                      class="w-full sm:w-auto px-5 py-2.5 rounded-md text-[13px] font-medium border border-black/20 dark:border-white/20 text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      {{ t('app.cancel', 'Cancel') }}
                    </button>
                    
                    <button
                      @click="executePayout"
                      :disabled="payoutCountdown > 0 || isRequestingPayout"
                      class="w-full sm:w-auto px-5 py-2.5 rounded-md text-[13px] font-medium bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      <span v-if="isRequestingPayout" class="material-icons-round animate-spin text-[16px] mr-2">autorenew</span>
                      {{ t('dashboard.payouts.confirm_btn', 'I Agree & Submit') }}
                      <span v-if="payoutCountdown > 0" class="ml-1">({{ payoutCountdown }})</span>
                    </button>
                  </div>
                  
                </div>
              </Transition>
            </div>
          </Transition>

    <SuccessModal
        :show="modalState.show"
        :message="modalState.message"
        :is-confirm="modalState.isConfirm"
        @close="closeModal"
        @confirm="handleModalConfirm"
      />

      <ImagePopup v-model="showAlertPopup" :images="alertImages" />
      <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showSetupPassphraseModal"
        class="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        @click.self="handleCancelPassphraseSetup"
      >
        <Transition
          enter-active-class="transition duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          enter-from-class="opacity-0 scale-90 translate-y-4"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-90 translate-y-4"
        >
          <div v-if="showSetupPassphraseModal" class="bg-white dark:bg-[#111] border border-black/10 dark:border-white/10 rounded-lg w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            <div class="px-6 py-5 border-b border-black/10 dark:border-white/10 flex items-start gap-3 shrink-0">
              <div class="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                <span class="material-icons-round text-[22px]">priority_high</span>
              </div>
              <div>
                <h3 class="text-[16px] font-semibold text-black dark:text-white leading-tight flex flex-wrap items-center gap-2">
                  {{ t("dashboard.overview.passphrase_title", "Payout Passphrase") }}
                  <span class="bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase border border-red-500/20">
                    {{ t("dashboard.overview.first_time_setup", "First Time Setup Required") }}
                  </span>
                </h3>
                <p class="text-[12px] text-[#666] dark:text-[#a1a1a1] mt-1.5 leading-relaxed">
                  {{ t("dashboard.overview.passphrase_desc", "This passphrase acts as your private financial key, required to authorize payouts in the Manage Payouts portal. To configure this key initially, you must provide your registered account email.") }}
                </p>
              </div>
            </div>
            
            <div class="p-6 space-y-5 overflow-y-auto flex-1">
              <div class="relative w-full">
                <input
                  @keydown.space.prevent
                  v-model="passphraseForm.passphrase"
                  :type="passwordVisible.phraseSetup ? 'text' : 'password'"
                  placeholder=" "
                  class="peer w-full p-[14px_16px] pr-12 text-[14px] rounded-md bg-transparent border outline-none z-1 focus:border-2 focus:p-[13px_15px] focus:pr-11.75 border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20"
                  :class="{'border-red-500 text-red-500 focus:border-red-500': newPassphraseError && passphraseForm.passphrase}"
                />
                <label
                  class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-white dark:bg-[#111] px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left transition-[top,transform,scale] duration-200 ease-in-out text-[#666] dark:text-[#a1a1a1] peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]"
                  :class="{'text-red-500 peer-focus:text-red-500': newPassphraseError && passphraseForm.passphrase}"
                >
                  {{ t("dashboard.overview.new_passphrase", "New Passphrase") }}
                </label>
                <button
                  @click="togglePasswordVisible('phraseSetup')"
                  type="button"
                  class="absolute right-4 top-0 bottom-0 my-auto flex items-center justify-center text-[#999] hover:text-black dark:text-[#666] dark:hover:text-white transition-colors z-10"
                  tabindex="-1"
                >
                  <span class="material-icons-round text-[20px]">{{ passwordVisible.phraseSetup ? "visibility_off" : "visibility" }}</span>
                </button>
              </div>
              <div v-if="passphraseForm.passphrase && newPassphraseError" class="text-red-500 text-xs mt-[-12px] ml-1">
                {{ newPassphraseError }}
              </div>

              <div class="relative w-full">
                <input
                  @keydown.space.prevent
                  v-model="passphraseForm.confirmPassphrase"
                  :type="passwordVisible.phraseSetupConfirm ? 'text' : 'password'"
                  placeholder=" "
                  class="peer w-full p-[14px_16px] pr-12 text-[14px] rounded-md bg-transparent border outline-none z-1 focus:border-2 focus:p-[13px_15px] focus:pr-11.75 border-black/20 dark:border-white/20 text-black dark:text-white focus:border-[#0070f3] dark:focus:border-[#3291ff] placeholder-shown:border-black/20 dark:placeholder-shown:border-white/20"
                  :class="{'border-red-500 text-red-500 focus:border-red-500': confirmPassphraseError && passphraseForm.confirmPassphrase}"
                />
                <label
                  class="absolute left-3 top-0 -translate-y-1/2 scale-75 bg-white dark:bg-[#111] px-1 text-[14px] font-normal leading-none pointer-events-none z-2 origin-left transition-[top,transform,scale] duration-200 ease-in-out text-[#666] dark:text-[#a1a1a1] peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:text-[#0070f3] dark:peer-focus:text-[#3291ff]"
                  :class="{'text-red-500 peer-focus:text-red-500': confirmPassphraseError && passphraseForm.confirmPassphrase}"
                >
                  {{ t("dashboard.overview.confirm_passphrase", "Confirm Passphrase") }}
                </label>
                <button
                  @click="togglePasswordVisible('phraseSetupConfirm')"
                  type="button"
                  class="absolute right-4 top-0 bottom-0 my-auto flex items-center justify-center text-[#999] hover:text-black dark:text-[#666] dark:hover:text-white transition-colors z-10"
                  tabindex="-1"
                >
                  <span class="material-icons-round text-[20px]">{{ passwordVisible.phraseSetupConfirm ? "visibility_off" : "visibility" }}</span>
                </button>
              </div>
              <div v-if="passphraseForm.confirmPassphrase && confirmPassphraseError" class="text-red-500 text-xs mt-[-12px] ml-1">
                {{ confirmPassphraseError }}
              </div>
            </div>

              <div class="px-6 py-4 border-t border-black/10 dark:border-white/10 bg-[#fafafa] dark:bg-[#0a0a0a] flex flex-col sm:flex-row items-center justify-end gap-3 shrink-0">
              <button
                @click="handleCancelPassphraseSetup"
                class="w-full sm:w-auto px-5 py-2.5 rounded-md text-[13px] font-medium border border-black/20 dark:border-white/20 text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                {{ t('app.cancel', 'Cancel') }}
              </button>
              
              <button
                @click="configurePassphrase"
                :disabled="isConfiguringPassphrase || !isSetupValid"
                class="w-full sm:w-auto px-5 py-2.5 rounded-md text-[13px] font-medium bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <span v-if="isConfiguringPassphrase" class="material-icons-round animate-spin text-[16px] mr-2">autorenew</span>
                {{ isConfiguringPassphrase ? t("dashboard.modal.processing", "Processing...") : t("dashboard.overview.verify_btn", "Configure Key") }}
              </button>
            </div>
            
          </div>
        </Transition>
      </div>
    </Transition>
    </main>
  </div>
</template>

<style scoped>
.certificate-richtext :deep(p) {
  margin: 0.75em 0;
}

.certificate-richtext :deep(strong) {
  font-weight: 600;
  color: inherit;
}

.certificate-richtext :deep(br) {
  display: block;
  content: "";
  margin-top: 0.25em;
}

.certificate-richtext :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  margin: 0.5em 0;
}

.certificate-richtext :deep(a) {
  color: #0070f3;
  text-decoration: underline;
}

.certificate-richtext :deep(ul),
.certificate-richtext :deep(ol) {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

@keyframes rainbow-glow-spin {
  0% {
    background-position: 0% 50%;
  }

  50% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 0% 50%;
  }
}

.animate-rainbow-glow-spin {
  animation: rainbow-glow-spin 3s ease infinite;
}

.confetti {
  position: fixed;
  width: 8px;
  height: 16px;
  top: -20px;
  opacity: 0;
  animation: fall linear infinite;
  border-radius: 2px;
  z-index: 999999999999999;
}

@keyframes fall {
  0% {
    top: -20px;
    opacity: 1;
    transform: translateX(0) rotate(0deg) rotateX(0deg) scale(1);
  }
  50% {
    transform: translateX(20px) rotate(180deg) rotateX(180deg) scale(0.9);
  }
  100% {
    top: 100vh;
    opacity: 0;
    transform: translateX(-20px) rotate(720deg) rotateX(720deg) scale(0.8);
  }
}

.slide-up-enter-active,
.slide-up-leave-active,
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(15px);
}
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-15px);
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-15px);
}
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(15px);
}
</style>
