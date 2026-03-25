import type { LocalizedString } from '@/ui/i18n';

export type MessageTemplate = {
  title: LocalizedString;
  body?: LocalizedString;
};

export const MESSAGES = {
  auth: {
    signup: {
      success: {
        title: { en: 'Account created successfully', so: 'Akoon si guul leh ayaa loo sameeyay' },
        body: { en: 'Please login.', so: 'Fadlan gal (login).' },
      } satisfies MessageTemplate,
      fail: {
        title: { en: 'Sign up failed', so: 'Diiwaangelintu way fashilantay' },
        body: { en: 'Please try again in a moment.', so: 'Fadlan isku day mar kale.' },
      } satisfies MessageTemplate,
    },
    login: {
      success: {
        title: { en: 'Welcome back', so: 'Ku soo dhawoow' },
        body: { en: 'You are signed in.', so: 'Waad gashay.' },
      } satisfies MessageTemplate,
      fail: {
        title: { en: 'Sign in failed', so: 'Geliddu way fashilantay' },
        body: { en: 'Check your details and try again.', so: 'Hubi xogtaada oo mar kale isku day.' },
      } satisfies MessageTemplate,
    },
  },

  donor: {
    registration: {
      success: {
        title: { en: 'Donor profile created', so: 'Diiwaanka deeq-bixiyaha waa la sameeyay' },
        body: { en: 'Thanks for registering as a donor.', so: 'Waad ku mahadsan tahay isdiiwaangelinta.' },
      } satisfies MessageTemplate,
      fail: {
        title: { en: 'Registration failed', so: 'Diiwaangelintu way fashilantay' },
        body: { en: 'Please review the form and try again.', so: 'Fadlan dib u eeg foomka oo mar kale isku day.' },
      } satisfies MessageTemplate,
      validation: {
        title: { en: 'Validation', so: 'Xaqiijin' },
        body: { en: 'Please fix the errors.', so: 'Fadlan sax khaladaadka.' },
      } satisfies MessageTemplate,
      datePickerUnavailable: {
        title: { en: 'Date picker unavailable', so: 'Doorashada taariikhda lama heli karo' },
        body: { en: 'You can type the date manually (mm/dd/yyyy).', so: 'Waxaad si toos ah u qori kartaa (mm/dd/yyyy).' },
      } satisfies MessageTemplate,
    },
  },

  request: {
    create: {
      success: {
        title: { en: 'Request submitted', so: 'Codsiga waa la diray' },
        body: { en: 'We’ll notify compatible donors.', so: 'Waxaan ogeysiin doonaa deeq-bixiyayaasha ku habboon.' },
      } satisfies MessageTemplate,
      fail: {
        title: { en: 'Submit failed', so: 'Diristu way fashilantay' },
        body: { en: 'Could not create request.', so: 'Lama abuuri karin codsiga.' },
      } satisfies MessageTemplate,
      validation: {
        title: { en: 'Check your input', so: 'Hubi xogta aad gelisay' },
        body: { en: 'Please fill in all required fields correctly.', so: 'Fadlan si sax ah u buuxi dhammaan meelaha muhiimka ah.' },
      } satisfies MessageTemplate,
    },
  },

  password: {
    change: {
      success: { title: { en: 'Password updated', so: 'Furaha sirta waa la beddelay' }, body: { en: 'Your password has been changed.', so: 'Furaha sirta waa la cusboonaysiiyay.' } },
      fail: { title: { en: 'Update failed', so: 'Cusboonaysiintu way fashilantay' }, body: { en: 'Please try again.', so: 'Fadlan mar kale isku day.' } },
    },
    reset: {
      success: { title: { en: 'Password reset', so: 'Furaha sirta waa la dejiyay' }, body: { en: 'You can now sign in with your new password.', so: 'Hadda waxaad gali kartaa adigoo adeegsanaya furaha cusub.' } },
      fail: { title: { en: 'Reset failed', so: 'Dib u dejintu way fashilantay' }, body: { en: 'Please try again.', so: 'Fadlan mar kale isku day.' } },
    },
  },

  profile: {
    save: {
      success: { title: { en: 'Saved', so: 'Waa la keydiyay' }, body: { en: 'Changes saved.', so: 'Isbeddellada waa la keydiyay.' } },
      fail: { title: { en: 'Save failed', so: 'Keydintu way fashilantay' }, body: { en: 'Failed to save changes.', so: 'Lama keydin karin isbeddellada.' } },
    },
  },

  verification: {
    resend: {
      success: { title: { en: 'Code Sent', so: 'Koodh waa la diray' }, body: { en: 'A new verification code has been sent.', so: 'Koodh cusub oo xaqiijin ah ayaa la diray.' } },
      fail: { title: { en: 'Error', so: 'Khalad' }, body: { en: 'Unable to resend code.', so: 'Lama soo diri karin koodhka.' } },
    },
  },

  validation: {
    required: {
      email: { en: 'Email is required.', so: 'Email waa muhiim.' },
      phone: { en: 'Phone number is required.', so: 'Telefoon waa muhiim.' },
      password: { en: 'Password is required.', so: 'Furaha sirta waa muhiim.' },
      bloodGroup: { en: 'Blood group is required.', so: 'Nooca dhiigga waa muhiim.' },
      district: { en: 'District is required.', so: 'Degmada waa muhiim.' },
    } satisfies Record<string, LocalizedString>,
  },
} as const;
