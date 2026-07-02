import { Layout } from "Client/Component/Layout/Index";
import { Button } from "Client/Component/UI/Button";
import { getFeelings } from "Server/API/Aid";
import { useNavigate } from "react-router-dom";

export default function FeelingIndex() {
  const feelingsList = getFeelings();
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="space-y-4">
        {/* Title removed to maximize vertical space */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {feelingsList.map((f) => (
            <Button 
              key={f.id} 
              fullWidth
              onClick={() => navigate(`/Aid/Feeling/${f.id}`)} 
            >
              {f.name}
            </Button>
          ))}
        </div>
      </div>
    </Layout>
  );
}