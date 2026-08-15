import { Layout } from "@Web/Component/Layout/Index";
import { Button } from "@Web/Component/UI/button";
import { Textarea } from "@Web/Component/UI/Textarea";
import { Input } from "@Web/Component/UI/Input";
import { Label } from "@Web/Component/UI/Label";
import { MessageSquare, Bug, Lightbulb, Heart } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/Hook/Use-Toast";

const feedbackTypes = [
  { id: "general", label: "General Feedback", icon: MessageSquare },
  { id: "bug", label: "Report a Bug", icon: Bug },
  { id: "feature", label: "Feature Request", icon: Lightbulb },
  { id: "appreciation", label: "Appreciation", icon: Heart },
];

const Feedback = () => {
  const [selectedType, setSelectedType] = useState("general");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Thank you for your feedback!",
      description: "We appreciate you taking the time to help us improve Al-Deen.org.",
    });
    setEmail("");
    setMessage("");
  };

  return (
    <Layout>
      <section className="py-8 md:py-16 px-4">
        <div className="container max-w-2xl mx-auto">
          <div className="text-center mb-8 md:mb-10">
            <h1 className="font-brand text-3xl sm:text-4xl md:text-5xl mb-3 md:mb-4">Feedback</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              We value your input. Help us make Al-Deen.org better for everyone.
            </p>
          </div>

          <div className="glass-card p-4 sm:p-6 md:p-8">
            <div className="glass-content">
              <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
                {/* Feedback Type */}
                <div>
                  <Label className="mb-3 block text-sm sm:text-base">What type of feedback do you have?</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {feedbackTypes.map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setSelectedType(type.id)}
                        className={`glass-btn p-3 sm:p-4 text-left flex items-center gap-3 ${
                          selectedType === type.id
                            ? "!bg-primary/20 text-primary"
                            : ""
                        }`}
                      >
                        <type.icon className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${selectedType === type.id ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={`text-sm sm:text-base ${selectedType === type.id ? "text-primary font-medium" : "text-foreground"}`}>
                          {type.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="email" className="text-sm sm:text-base">Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-2 glass-input h-11 sm:h-12 px-4"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Provide your email if you'd like us to follow up with you.
                  </p>
                </div>

                {/* Message */}
                <div>
                  <Label htmlFor="message" className="text-sm sm:text-base">Your Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us what's on your mind..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="mt-2 min-h-[120px] sm:min-h-[150px] glass-input rounded-2xl p-4"
                    required
                  />
                </div>

                <button type="submit" className="glass-btn w-full py-3 sm:py-4 bg-primary/20 text-primary font-medium">
                  Submit Feedback
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Feedback;
