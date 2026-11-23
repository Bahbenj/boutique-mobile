/**
 * Dictionnaire français. Pour ajouter l'arabe : créer ar.ts avec la même
 * forme (type Dictionary) et l'enregistrer dans i18n/index.ts.
 */
export const fr = {
  nav: {
    shop: "Boutique",
    repair: "Réparation",
    about: "À propos",
    contact: "Contact",
    account: "Compte",
    cta: "Commander",
    cart: "Panier",
    menu: "Menu",
    close: "Fermer",
    home: "Accueil",
  },
  hero: {
    scroll: "Faites défiler",
    primary: "Voir la boutique",
    secondary: "Écrire sur WhatsApp",
  },
  auth: {
    loginTitle: "Bon retour",
    signupTitle: "Créer un compte",
    loginLead: "Suivez vos commandes et retrouvez vos favoris.",
    signupLead: "Commandez plus vite et suivez vos livraisons.",
    name: "Nom complet",
    phone: "Téléphone",
    email: "E-mail",
    password: "Mot de passe",
    login: "Se connecter",
    signup: "Créer mon compte",
    switchToSignup: "Pas encore de compte ?",
    switchToLogin: "Déjà client ?",
    signupLink: "Inscription",
    loginLink: "Connexion",
    soon: "Les comptes clients arrivent bientôt. En attendant, commandez sans compte : c'est rapide.",
  },
  footer: {
    shop: "Boutique",
    info: "Informations",
    contact: "Nous trouver",
    returns: "Retours & garantie",
    terms: "CGV",
    rights: "Tous droits réservés.",
    hours: "Horaires",
  },
  whatsapp: {
    fab: "Nous écrire sur WhatsApp",
    greeting: "Bonjour, j'ai une question.",
  },
} as const;

export type Dictionary = typeof fr;
