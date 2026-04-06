## ApnaGhar (Web)

A Firebase-powered real-estate web app aligned with your Android app's Firestore rules and collections.

### Tech
- HTML/CSS/JS (no framework)
- Firebase v10 modular SDK (Auth, Firestore)

### Setup
1. Open `index.html` directly in a modern browser.
2. Firebase config is set in `js/firebase.js` for project `apnaghar-a58fd`.
3. In Firebase Console:
   - Auth → enable Email/Password and Google.
   - Firestore → create database and paste the rules below.
   - Storage → not required for now (use external image URLs in Admin form).

### Firestore Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function isOwner(userId) { return isSignedIn() && request.auth.uid == userId; }

    match /users/{userId} {
      allow read: if isOwner(userId);
      allow create: if isOwner(userId);
      allow update: if isOwner(userId);
      allow delete: if false;
    }

    match /properties/{propertyId} {
      allow read: if true;
      allow create: if isSignedIn();
      allow update: if isSignedIn() && request.resource.data.ownerId == request.auth.uid;
      allow delete: if isSignedIn() && resource.data.ownerId == request.auth.uid;

      allow create, update: if
        (
          request.resource.data.title is string && request.resource.data.title.size() > 0 && request.resource.data.title.size() <= 100
        ) &&
        (
          !('description' in request.resource.data) || (request.resource.data.description is string && request.resource.data.description.size() <= 1000)
        ) &&
        (
          !('propertyType' in request.resource.data) || (request.resource.data.propertyType in ['apartment','house','villa','plot'])
        ) &&
        (
          !('listingType' in request.resource.data) || (request.resource.data.listingType in ['sale','rent'])
        ) &&
        (
          !('bhk' in request.resource.data) || (request.resource.data.bhk is int && request.resource.data.bhk >= 1 && request.resource.data.bhk <= 5)
        ) &&
        (
          !('bathrooms' in request.resource.data) || (request.resource.data.bathrooms is int && request.resource.data.bathrooms >= 0)
        ) &&
        (
          !('area' in request.resource.data) || (request.resource.data.area is int && request.resource.data.area >= 0)
        ) &&
        (
          !('price' in request.resource.data) || (
            (request.resource.data.price is int && request.resource.data.price >= 0) ||
            (request.resource.data.price is string && request.resource.data.price.size() > 0)
          )
        ) &&
        (
          !('furnished' in request.resource.data) || (request.resource.data.furnished in ['unfurnished','semi-furnished','fully-furnished'])
        ) &&
        (
          !('parking' in request.resource.data) || (request.resource.data.parking is bool)
        ) &&
        (
          !('balcony' in request.resource.data) || (request.resource.data.balcony is int && request.resource.data.balcony >= 0)
        ) &&
        (
          !('floor' in request.resource.data) || (request.resource.data.floor is int)
        ) &&
        (
          !('totalFloors' in request.resource.data) || (request.resource.data.totalFloors is int)
        ) &&
        (
          !('city' in request.resource.data) || (request.resource.data.city is string)
        ) &&
        (
          !('locality' in request.resource.data) || (request.resource.data.locality is string)
        ) &&
        (
          !('address' in request.resource.data) || (request.resource.data.address is string)
        ) &&
        (
          !('images' in request.resource.data) || (request.resource.data.images is list && request.resource.data.images.size() <= 10)
        ) &&
        (
          !('imageUrl' in request.resource.data) || (request.resource.data.imageUrl is string)
        ) &&
        (
          !('latitude' in request.resource.data) || (request.resource.data.latitude is number)
        ) &&
        (
          !('longitude' in request.resource.data) || (request.resource.data.longitude is number)
        ) &&
        (
          !('ownerId' in request.resource.data) || (request.resource.data.ownerId is string)
        ) &&
        (
          request.method == 'create' ? (!('views' in request.resource.data) || request.resource.data.views == 0) : true
        );
    }

    match /favorites/{userId}/properties/{propertyId} {
      allow read: if isOwner(userId);
      allow create: if isOwner(userId) && request.resource.data.propertyId == propertyId;
      allow delete: if isOwner(userId);
      allow update: if false;
    }
  }
}
```

### Collections
- `properties`: property listings
- `favorites/{userId}/properties/{propertyId}`: user favorites
- `users/{userId}`: user profile (private)

### Notes
- Images: paste external URLs into the admin form for now.
- Deleting: owners can delete their own properties.
- Search: client-side keyword filter + Firestore filters on `propertyType` and `listingType`.

### Deploy to Production (Firebase Hosting)
1. Install Firebase CLI: `npm i -g firebase-tools`
2. Login: `firebase login`
3. Ensure `.firebaserc` project is `apnaghar-a58fd` (already set).
4. Initialize (optional if files exist): `firebase init hosting` (choose existing project, public dir `.`, SPA yes)
5. Deploy: `firebase deploy --only hosting`

Notes:
- SPA rewrite sends all routes to `index.html`.
- 404 fallback page is `404.html` (not used due to SPA rewrite, but kept for direct access).
- CSP is set in `index.html`; if you add new CDNs/APIs, update the CSP accordingly.

### Roadmap
- External image hosting integration
- Admin moderation tools / roles
- Map view and location filters


