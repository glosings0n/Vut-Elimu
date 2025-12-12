import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  deleteDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { UserProfile, UserRole, UserStats } from "../types";

// Configuration provided by user
const firebaseConfig = {
  apiKey: "AIzaSyAPRvsPk37HKRMHwc7T6gg757vYpBUivKc",
  authDomain: "vut-elimu.firebaseapp.com",
  databaseURL: "https://vut-elimu-default-rtdb.firebaseio.com",
  projectId: "vut-elimu",
  storageBucket: "vut-elimu.firebasestorage.app",
  messagingSenderId: "879266000392",
  appId: "1:879266000392:web:612a615950868593682bbd"
};

// Initialize Firebase directly (Online Mode)
// We avoid persistence here to prevent 'failed to open DB' errors in restrictive iframe environments
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

console.log("Firebase initialized (Online Mode)");

export const firebaseService = {
  /**
   * Helper to upload base64 image to specific Storage paths
   */
  async uploadImage(base64Data: string, path: string): Promise<string | null> {
    if (!storage) {
        console.warn("Storage not initialized, skipping upload.");
        return null;
    }
    if (!base64Data) return null;
    
    try {
        const storageRef = ref(storage, path);
        await uploadString(storageRef, base64Data, 'data_url');
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
    } catch (e) {
        console.error("Upload failed", e);
        return null;
    }
  },

  /**
   * Checks if user/school exists in Firestore
   */
  async getUser(id: string, role: UserRole): Promise<UserProfile | null> {
    if (!db) {
        console.error("Database not initialized, cannot get user.");
        return null;
    }
    try {
        // Handle legacy "INDIVIDUAL" role by checking 'players' collection
        // If the passed role string is "INDIVIDUAL", we map it to UserRole.PLAYER logic
        const effectiveRole = (role as string) === 'INDIVIDUAL' ? UserRole.PLAYER : role;
        const collectionName = effectiveRole === UserRole.SCHOOL ? 'schools' : 'players';
        
        const docRef = doc(db, collectionName, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Normalize role from DB if it is stored as 'INDIVIDUAL'
          let dbRole = data.role;
          if (dbRole === 'INDIVIDUAL') dbRole = UserRole.PLAYER;

          return {
              id: data.id,
              name: data.name || data.id,
              role: dbRole,
              mode: data.mode,
              photoURL: data.photoURL,
              level: data.level || 1,
              stats: data.stats || { points: 0, gamesPlayed: 0 }
          } as UserProfile;
        }
    } catch (e) {
        console.error("Error fetching user:", e);
    }
    return null;
  },

  /**
   * Creates a new user/school document
   */
  async createUser(user: UserProfile): Promise<UserProfile | null> {
    if (!db || !user.id) return null;
    try {
        const collectionName = user.role === UserRole.SCHOOL ? 'schools' : 'players';
        
        // Handle Avatar Upload if present
        let finalPhotoURL = user.photoURL || "";
        if (finalPhotoURL.startsWith('data:image')) {
             const path = `${collectionName}/${user.id}.png`;
             const url = await this.uploadImage(finalPhotoURL, path);
             if (url) finalPhotoURL = url;
        }

        const docData = {
            id: user.id,
            role: user.role,
            mode: typeof user.mode === 'string' ? user.mode.toLowerCase() : "standard",
            createdAt: serverTimestamp(),
            stats: {
                gamesPlayed: 0,
                points: 0,
                ...(user.role === UserRole.SCHOOL ? { groupsNumber: 0 } : {})
            },
            level: 1,
            name: user.name,
            photoURL: finalPhotoURL
        };

        await setDoc(doc(db, collectionName, user.id), docData);
        
        return { ...user, photoURL: finalPhotoURL };
    } catch (e) {
        console.error("Error creating user:", e);
        return null;
    }
  },
  
  /**
   * Updates user stats and avatar
   */
  async updateUserProgress(user: UserProfile) {
      if (!db || !user.id) return;
      try {
           let docRef;
           let finalPhotoURL = user.photoURL;

           // Determine path and upload image if needed
           if (user.parentId) {
               // Sub-group
               docRef = doc(db, 'schools', user.parentId, 'groups', user.id);
               if (finalPhotoURL && finalPhotoURL.startsWith('data:image')) {
                    const path = `schools/groups/${user.id}.png`;
                    const url = await this.uploadImage(finalPhotoURL, path);
                    if (url) finalPhotoURL = url;
               }
           } else {
               // Root Player or School
               const collectionName = user.role === UserRole.SCHOOL ? 'schools' : 'players';
               docRef = doc(db, collectionName, user.id);
               if (finalPhotoURL && finalPhotoURL.startsWith('data:image')) {
                    const path = `${collectionName}/${user.id}.png`;
                    const url = await this.uploadImage(finalPhotoURL, path);
                    if (url) finalPhotoURL = url;
               }
           }

           const updateData: any = { 
               'stats.points': user.stats.points, 
               'level': user.level,
               'stats.gamesPlayed': (user.stats.gamesPlayed || 0) + 1,
           };

           if (finalPhotoURL !== user.photoURL) {
               updateData.photoURL = finalPhotoURL;
           }

           await updateDoc(docRef, updateData);
           return finalPhotoURL;
      } catch (e) {
          console.error("Error updating progress:", e);
          return user.photoURL;
      }
  },

  // --- SCHOOL GROUPS MANAGEMENT ---

  async getSchoolGroups(schoolId: string): Promise<UserProfile[]> {
      if (!db) return [];
      try {
          const q = query(
              collection(db, 'schools', schoolId, 'groups'),
              orderBy('stats.points', 'desc'),
              limit(50)
          );
          
          const querySnapshot = await getDocs(q);
          const groups: UserProfile[] = [];
          
          querySnapshot.forEach((doc) => {
              const data = doc.data();
              groups.push({
                  id: data.id,
                  name: data.name,
                  photoURL: data.photoURL,
                  role: UserRole.GROUP,
                  mode: data.mode,
                  level: data.level || 1,
                  stats: data.stats || { points: 0, gamesPlayed: 0, wins: 0 },
                  parentId: schoolId 
              });
          });
          return groups;
      } catch (e) {
          console.error("Error getting groups:", e);
          return [];
      }
  },

  // --- GLOBAL LEADERBOARD (PLAYERS) ---
  
  async getGlobalLeaderboard(): Promise<UserProfile[]> {
      if (!db) return [];
      try {
          // Fetch top players from the 'players' collection
          const q = query(
              collection(db, 'players'),
              orderBy('stats.points', 'desc'),
              limit(20)
          );
          
          const querySnapshot = await getDocs(q);
          const players: UserProfile[] = [];
          
          querySnapshot.forEach((doc) => {
              const data = doc.data();
              let role = data.role;
              if (role === 'INDIVIDUAL') role = UserRole.PLAYER;

              players.push({
                  id: data.id,
                  name: data.name || data.id,
                  photoURL: data.photoURL,
                  role: role,
                  mode: data.mode,
                  level: data.level || 1,
                  stats: data.stats || { points: 0, gamesPlayed: 0 }
              });
          });
          return players;
      } catch (e) {
          console.error("Error getting global leaderboard:", e);
          return [];
      }
  },

  async saveSchoolGroup(schoolId: string, group: UserProfile): Promise<UserProfile | null> {
      if (!db || !group.name) return null;
      try {
          const groupId = group.id || group.name.trim().replace(/\s+/g, '_').toUpperCase();
          let finalPhotoURL = group.photoURL || "";

          // Upload Image to specific path: schools/groups/{groupID}.png
          if (finalPhotoURL.startsWith('data:image')) {
              const path = `schools/groups/${groupId}.png`;
              const uploadedUrl = await this.uploadImage(finalPhotoURL, path);
              if (uploadedUrl) finalPhotoURL = uploadedUrl;
          }

          const docData = {
              id: groupId,
              name: group.name,
              role: "GROUP",
              mode: typeof group.mode === 'string' ? group.mode : "standard",
              photoURL: finalPhotoURL,
              createdAt: serverTimestamp(),
              stats: {
                  gamesPlayed: group.stats?.gamesPlayed || 0,
                  points: group.stats?.points || 0,
                  wins: group.stats?.wins || 0
              },
              level: group.level || 1
          };

          await setDoc(doc(db, 'schools', schoolId, 'groups', groupId), docData);
          
          return {
              ...group,
              id: groupId,
              photoURL: finalPhotoURL,
              stats: docData.stats as UserStats,
              role: UserRole.GROUP,
              parentId: schoolId
          };

      } catch (e) {
          console.error("Error saving group:", e);
          return null;
      }
  },
  
  async deleteSchoolGroup(schoolId: string, groupName: string): Promise<void> {
       if (!db) return;
       try {
           const groupId = groupName.trim().replace(/\s+/g, '_').toUpperCase();
           await deleteDoc(doc(db, 'schools', schoolId, 'groups', groupId));
       } catch (e) {
           console.error("Error deleting group:", e);
       }
  }
};