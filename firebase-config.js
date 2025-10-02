// Замените эти значения на вашу конфигурацию Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAf88iNaZzwhYi3JI91hTTNkKPhvLbvqP0",
  authDomain: "my-notes-app-5644d.firebaseapp.com",
  projectId: "my-notes-app-5644d",
  storageBucket: "my-notes-app-5644d.firebasestorage.app",
  messagingSenderId: "658136663511",
  appId: "1:658136663511:web:062b48c6ddb602bf44b792"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);

// Инициализация сервисов
const auth = firebase.auth();
const db = firebase.firestore();