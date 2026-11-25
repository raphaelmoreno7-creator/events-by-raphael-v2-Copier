EVENTS by Raphaël — GUIDE D'INSTALLATION
========================================

CONTENU DU DOSSIER
- index.html : structure des pages publiques et de l'administration.
- style.css : design responsive.
- app.js : logique de l'application.
- config.js : URL et clé publishable Supabase.
- README-GUIDE.txt : ce guide.

IMPORTANT AVANT DE PUBLIER
1. Ne partage jamais une clé Supabase "secret" ou "service_role".
2. Le fichier config.js contient uniquement la clé publishable déjà fournie.
3. Le site dépend des politiques RLS de Supabase. Ne désactive pas RLS.
4. Les invités ne doivent jamais avoir accès à l'espace admin.
5. L'adresse personnelle exacte ne doit pas être mise dans la fiche publique de l'événement.

INSTALLATION SUR GITHUB
1. Ouvre ton dépôt :
   https://github.com/raphaelmoreno7-creator/events-by-raphael-v2-Copier
2. Ouvre le dépôt et choisis Add file > Upload files.
3. Décompresse l'archive ZIP sur ton appareil.
4. Envoie les 5 fichiers à la racine du dépôt (pas dans un sous-dossier).
5. Clique sur Commit changes.
6. Dans Settings > Pages, vérifie que GitHub Pages publie depuis la branche configurée (habituellement main / root).
7. Attends la fin du déploiement puis ouvre :
   https://raphaelmoreno7-creator.github.io/events-by-raphael-v2-Copier/

CONFIGURATION SUPABASE DÉJÀ CONNUE
- Projet : events-by-raphael-v2
- URL : https://ixzxgyhofbdzyxpbaivs.supabase.co
- Authentification par e-mail activée.
- Inscription publique désactivée.
- URL du site et URL de redirection GitHub Pages configurées précédemment.
- Les politiques RLS administrateur et publiques ont été mises en place et vérifiées dans les échanges précédents.

SCHÉMA DE BASE DE DONNÉES ATTENDU
events :
id, title, organizer, event_date, event_time, location_label, description,
extra_info, theme, status, created_at, updated_at

invitees :
id, event_id, name, status, created_at

rsvps :
id, event_id, invitee_id, guest_name, attendance, party_size, message,
created_at, updated_at

Ne relance pas le script de création des tables et ne supprime aucune table existante.
Le site stocke les couleurs de thème dans la colonne events.theme sous forme de JSON texte.

UTILISATION
1. Ouvre le site puis Administration.
2. Connecte-toi avec le compte administrateur déjà créé dans Supabase Auth.
3. Crée un événement et renseigne ses informations.
4. Dans "Thème de l'événement", choisis un thème (Noël, Halloween, Printemps,
   Été, Automne, Élégance, Anniversaire festif) ou règle chaque couleur à la main.
5. Vérifie l'aperçu, choisis Brouillon ou Publié, puis enregistre.
6. Ajoute les invités depuis l'onglet Invités après avoir sélectionné un événement.
7. Copie le lien de l'événement publié pour l'envoyer aux personnes invitées.
8. Consulte et gère les réponses dans l'onglet Réponses.

STATUTS DES ÉVÉNEMENTS
- Brouillon : non visible publiquement.
- Publié : visible via son lien.
- Archivé : non visible publiquement.

LIMITES À CONNAÎTRE — VERSION INITIALE
- Le formulaire public enregistre les réponses, mais n'envoie pas d'e-mail automatique.
- Les invités n'ont pas de compte.
- Les réponses ne sont pas publiquement consultables.
- L'ajout d'invités est réservé à l'administrateur.
- Le rapprochement automatique entre un RSVP et une fiche invité n'est pas activé.
- L'édition d'une réponse dans l'administration utilise des fenêtres de saisie simples.
- Le thème saisonnier fournit une palette de couleurs ; les illustrations décoratives
  spécifiques à chaque fête ne sont pas encore intégrées.
- Une protection anti-spam avancée (captcha, limitation par adresse IP côté serveur)
  n'est pas incluse dans cette version.
- L'export CSV/Excel et l'historique détaillé des modifications ne sont pas inclus.

TESTS À EFFECTUER AVANT UTILISATION RÉELLE
1. Connecte-toi comme administrateur et crée un événement de test.
2. Publie-le puis ouvre son lien dans une fenêtre privée / navigation privée.
3. Vérifie que l'invitation s'affiche et qu'un RSVP peut être envoyé.
4. Vérifie que la réponse apparaît dans l'administration.
5. Vérifie qu'une personne non connectée ne peut pas ouvrir l'administration.
6. Vérifie qu'un événement en brouillon n'est pas visible publiquement.
7. Vérifie que la suppression d'un événement supprime ses réponses et invités.
8. Vérifie les liens de réinitialisation du mot de passe.

SÉCURITÉ ET DONNÉES
Les règles RLS actuellement configurées permettent à l'administrateur dont l'UUID
a été autorisé dans les politiques de gérer les tables. Les visiteurs peuvent lire
les événements publiés et insérer une réponse à un événement publié, mais ne
doivent pas pouvoir lire ou modifier les réponses.
Le contrôle des permissions doit être retesté après toute modification Supabase.

La politique publique d'insertion RSVP n'est pas un système anti-spam complet.
Pour un usage plus large, ajouter une fonction serveur / Edge Function avec validation,
limitation de débit et mécanisme anti-robot.

DÉPANNAGE
- Page vide : vérifie que les 5 fichiers sont bien à la racine du dépôt et que
  GitHub Pages est activé.
- Erreur de configuration : vérifie config.js.
- Échec connexion : vérifie le compte Auth et les URL de redirection.
- Échec création/modification : vérifie les colonnes attendues et les politiques RLS.
- Les événements publics n'apparaissent pas : vérifie leur statut "published".

Cette version est une première livraison fonctionnelle à tester. Ne l'utilise pas
pour collecter des informations sensibles. Fais tester les flux avant d'envoyer
un vrai lien à tes invités.
