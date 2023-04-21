import { atom, useRecoilValue } from "recoil";

const userState = atom({
  key: "user",
  default: {
    loading: true,
    value: null,
  },
  effects: [
    ({ setSelf }) => {
      setSelf({ loading: false, value: {
        name: "Diego"
      } });
    },
  ],
});

const signIn = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

const registerUser = (email, password) =>
  createUserWithEmailAndPassword(auth, email, password);

const signOut = () => auth.signOut();

export default function useUser() {
  const { value, loading } = useRecoilValue(userState);

  return {
    user: value,
    loading,
    signIn,
    registerUser,
    signOut,
  };
}
