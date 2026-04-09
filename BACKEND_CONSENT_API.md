# API Endpoints pour le Consentement des Données

## Contexte

Suite au refus d'Apple concernant la collecte de données (Guidelines 5.1.1 et 5.1.2), nous devons implémenter un système de consentement pour l'envoi de données à OpenAI et Google.

## Endpoints à implémenter

### 1. GET /user/data-consent

**Description :** Récupère le statut du consentement de l'utilisateur authentifié

**Headers :**
```
Authorization: Bearer <token>
```

**Réponse Success (200) :**
```json
{
  "status": "granted" | "denied" | "pending",
  "timestamp": "2026-03-08T10:30:00.000Z"
}
```

**Réponse si aucun consentement trouvé (200) :**
```json
{
  "status": "pending",
  "timestamp": null
}
```

---

### 2. POST /user/data-consent

**Description :** Enregistre ou met à jour le consentement de l'utilisateur

**Headers :**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body :**
```json
{
  "status": "granted" | "denied",
  "timestamp": "2026-03-08T10:30:00.000Z"
}
```

**Réponse Success (200) :**
```json
{
  "success": true,
  "status": "granted",
  "timestamp": "2026-03-08T10:30:00.000Z"
}
```

**Réponse Error (400) :**
```json
{
  "error": "Invalid status value"
}
```

---

## Schéma de base de données suggéré

### Table: `user_consents`

| Colonne       | Type        | Description                                      |
|---------------|-------------|--------------------------------------------------|
| id            | UUID        | Primary key                                      |
| user_id       | UUID        | Foreign key vers la table users                  |
| status        | ENUM        | 'granted', 'denied', 'pending'                   |
| timestamp     | TIMESTAMP   | Date/heure du consentement                       |
| created_at    | TIMESTAMP   | Date de création de l'enregistrement             |
| updated_at    | TIMESTAMP   | Date de dernière mise à jour                     |

**Contrainte :** `user_id` doit être unique (un seul consentement actif par utilisateur)

---

## Exemple d'implémentation (Node.js/Express)

```typescript
// GET /user/data-consent
app.get('/user/data-consent', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const consent = await db.query(
      'SELECT status, timestamp FROM user_consents WHERE user_id = $1',
      [userId]
    );

    if (consent.rows.length === 0) {
      return res.json({ status: 'pending', timestamp: null });
    }

    res.json(consent.rows[0]);
  } catch (error) {
    console.error('Error fetching consent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /user/data-consent
app.post('/user/data-consent', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, timestamp } = req.body;

    // Validation
    if (!['granted', 'denied'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    // Upsert (INSERT ou UPDATE)
    const result = await db.query(
      `INSERT INTO user_consents (user_id, status, timestamp, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET status = $2, timestamp = $3, updated_at = NOW()
       RETURNING status, timestamp`,
      [userId, status, timestamp]
    );

    res.json({
      success: true,
      ...result.rows[0]
    });
  } catch (error) {
    console.error('Error saving consent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

## Migration SQL (PostgreSQL)

```sql
-- Créer l'ENUM pour le statut
CREATE TYPE consent_status AS ENUM ('pending', 'granted', 'denied');

-- Créer la table user_consents
CREATE TABLE user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status consent_status NOT NULL DEFAULT 'pending',
  timestamp TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index pour améliorer les performances
CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
```

---

## Notes importantes

1. **Conformité RGPD :** Le consentement doit être tracé avec un timestamp précis
2. **Révocation :** L'utilisateur doit pouvoir révoquer son consentement à tout moment
3. **Audit trail :** Envisagez de garder un historique des changements de consentement (table séparée)
4. **Validation :** Vérifiez que l'utilisateur a donné son consentement AVANT de traiter des données sensibles
5. **Suppression de compte :** Le consentement doit être supprimé (CASCADE) quand le compte est supprimé

---

## Checklist de déploiement

- [ ] Créer la migration de base de données
- [ ] Implémenter les 2 endpoints API
- [ ] Tester avec Postman/Insomnia
- [ ] Vérifier que le consentement est bien requis avant d'envoyer des données à OpenAI/Google
- [ ] Mettre à jour la politique de confidentialité
- [ ] Tester le flux complet depuis l'app mobile
- [ ] Vérifier la synchronisation AsyncStorage ↔ Backend
