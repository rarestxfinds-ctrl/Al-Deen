import { useState, useEffect } from "react";
import { Layout } from "@Web/Component/Layout/Index";
import { QiblaCompass } from "@Web/Component/Qibla-Compass";
import { Container } from "@Web/Component/UI/Container";

const QiblaPage = () => {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLoading(false);
      },
      () => {
        fetch("https://ipapi.co/json/")
          .then((r) => r.json())
          .then((data) => {
            setLocation({ latitude: data.latitude, longitude: data.longitude });
            setLoading(false);
          })
          .catch(() => {
            setError("Unable to determine your location.");
            setLoading(false);
          });
      },
      { timeout: 5000 }
    );
  }, []);

  return (
    <Layout>
      <Container className="w-full !rounded-[48px]">
        {loading ? null : error ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">{error}</p>
          </div>
        ) : location ? (
          <QiblaCompass latitude={location.latitude} longitude={location.longitude} />
        ) : null}
      </Container>
    </Layout>
  );
};

export default QiblaPage;