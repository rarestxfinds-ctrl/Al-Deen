import { MapPin, RefreshCw } from "lucide-react";
import { Button } from "@/Top/Component/UI/Button";
import { Container } from "@/Top/Component/UI/Container";
import type { LocationData, HijriDate } from "./Types";

interface HeaderProps {
  location: LocationData | null;
  hijri: HijriDate | null;
  onRefresh: () => void;
}

export function Header({ location, hijri, onRefresh }: HeaderProps) {
  return (
    <>
      {/* Mobile layout – location + refresh wrapped in one Container, date outside */}
      <div className="md:hidden flex flex-col gap-3 mb-2">
        {location?.city && (
          <Container className="flex items-center justify-between gap-3 py-2 px-4">
            <div className="flex items-center gap-1.5 text-foreground min-w-0">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-base font-medium truncate">
                {location.city}
                {location.country ? `, ${location.country}` : ""}
              </span>
            </div>
            <Button
              size="sm"
              className="w-9 h-9 p-0 rounded-full flex-shrink-0"
              onClick={onRefresh}
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </Container>
        )}
        {hijri && (
          <div className="flex justify-center">
            <Container className="shrink-0 w-auto py-1.5 px-3">
              <p className="text-sm text-muted-foreground whitespace-nowrap font-sans">
                {hijri.day} {hijri.month.en} {hijri.year} {hijri.designation.abbreviated}
              </p>
            </Container>
          </div>
        )}
      </div>

      {/* Desktop layout – unchanged */}
      <div className="hidden md:flex items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          {location?.city && (
            <Container className="shrink-0 w-auto py-2 px-4">
              <div className="flex items-center gap-1.5 text-foreground">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-base font-medium">
                  {location.city}{location.country ? `, ${location.country}` : ""}
                </span>
              </div>
            </Container>
          )}
          {hijri && (
            <Container className="shrink-0 w-auto py-1.5 px-3">
              <p className="text-sm text-muted-foreground whitespace-nowrap font-sans">
                {hijri.day} {hijri.month.en} {hijri.year} {hijri.designation.abbreviated}
              </p>
            </Container>
          )}
        </div>
        <Button
          size="sm"
          className="w-9 h-9 p-0 rounded-full shrink-0"
          onClick={onRefresh}
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}