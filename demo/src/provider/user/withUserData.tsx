import { UserDataContext } from "@/context/UserDataContext";
import { useConfig } from "@/hook/useConfig";
import { useUsers } from "@/hook/useUsers";
import { Navigate, useParams } from "react-router-dom";

export default function withUserData<P extends object>(
  Component: React.ComponentType<P>
) {
  return function WithUserDataComponent(props: P) {
    const { id } = useParams();
    
    const { configs } = useConfig();
    const { users } = useUsers();
    
    if (!id) return <Navigate to="/users" replace />;

    const config = configs.find((u) => u.user_id === id);
    const user = users.find((u) => u.id === id);

    if (!config || !user) return <Navigate to="/users" replace />;

    return (
      <UserDataContext.Provider value={{ config, user }}>
        {<Component {...props} />}
      </UserDataContext.Provider>
    );
  };
}
