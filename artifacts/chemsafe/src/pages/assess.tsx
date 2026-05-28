import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateAssessment, AssessmentInputPipeMaterial, AssessmentInputGumType, AssessmentInputWaterFlowRate, AssessmentInputBuriedOrExposed, AssessmentInputUseContext } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const formSchema = z.object({
  pipe_material: z.nativeEnum(AssessmentInputPipeMaterial),
  gum_type: z.nativeEnum(AssessmentInputGumType),
  installation_age_years: z.number().min(0).max(50),
  pipe_diameter_mm: z.number().optional().nullable(),
  avg_temp_celsius: z.number().min(15).max(50),
  daily_uv_hours: z.number().min(0).max(14),
  water_flow_rate: z.nativeEnum(AssessmentInputWaterFlowRate),
  buried_or_exposed: z.nativeEnum(AssessmentInputBuriedOrExposed),
  use_context: z.nativeEnum(AssessmentInputUseContext),
  population_served: z.number().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export default function Assess() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [hasBackup, setHasBackup] = useState(false);
  
  const createAssessment = useCreateAssessment();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pipe_material: AssessmentInputPipeMaterial.Unknown,
      gum_type: AssessmentInputGumType.unknown,
      installation_age_years: 10,
      pipe_diameter_mm: null,
      avg_temp_celsius: 25,
      daily_uv_hours: 0,
      water_flow_rate: AssessmentInputWaterFlowRate.intermittent,
      buried_or_exposed: AssessmentInputBuriedOrExposed.buried,
      use_context: AssessmentInputUseContext.irrigation,
      population_served: null,
    },
  });

  useEffect(() => {
    const backup = sessionStorage.getItem("chemsafe_backup");
    if (backup) {
      try {
        const parsed = JSON.parse(backup);
        form.reset({ ...form.getValues(), ...parsed });
        setHasBackup(true);
      } catch (e) {
        console.error(e);
      }
    }
  }, [form]);

  const onSubmit = (data: FormValues) => {
    createAssessment.mutate(
      { data: { ...data, source: "form" } },
      {
        onSuccess: (assessment) => {
          sessionStorage.removeItem("chemsafe_backup");
          setLocation(`/results/${assessment.id}`);
        }
      }
    );
  };

  const nextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (step === 1) fieldsToValidate = ["pipe_material", "gum_type", "installation_age_years", "pipe_diameter_mm"];
    if (step === 2) fieldsToValidate = ["avg_temp_celsius", "daily_uv_hours", "water_flow_rate", "buried_or_exposed"];
    
    const isValid = await form.trigger(fieldsToValidate as any);
    if (isValid) setStep(step + 1);
  };

  return (
    <div className="min-h-[100dvh] pt-16 flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 max-w-3xl mx-auto w-full border-x flex flex-col">
        {hasBackup && (
          <div className="bg-accent text-background p-4 text-sm font-bold uppercase border-b">
            YOUR EARLIER ANSWERS WERE SAVED
          </div>
        )}

        <div className="p-8 border-b">
          <h1 className="text-4xl md:text-5xl uppercase mb-8">EXPERT FORM</h1>
          
          <div className="flex justify-between items-center border-b pb-4 mb-4 text-sm uppercase">
            <div className={`flex-1 ${step >= 1 ? 'text-foreground' : 'text-foreground/40'}`}>1. MATERIAL SPECS</div>
            <div className={`flex-1 ${step >= 2 ? 'text-foreground' : 'text-foreground/40'}`}>2. ENVIRONMENTAL</div>
            <div className={`flex-1 ${step >= 3 ? 'text-foreground' : 'text-foreground/40'}`}>3. USE CONTEXT</div>
          </div>
        </div>

        <div className="flex-1 p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              {step === 1 && (
                <div className="space-y-8 animate-in fade-in">
                  <FormField
                    control={form.control}
                    name="pipe_material"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="uppercase text-lg">PIPE MATERIAL</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-border rounded-none h-12">
                              <SelectValue placeholder="Select material" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-none border-border">
                            {Object.values(AssessmentInputPipeMaterial).map(val => (
                              <SelectItem key={val} value={val} className="rounded-none">{val}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gum_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="uppercase text-lg">GUM TYPE</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-border rounded-none h-12">
                              <SelectValue placeholder="Select gum type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-none border-border">
                            {Object.values(AssessmentInputGumType).map(val => (
                              <SelectItem key={val} value={val} className="rounded-none uppercase">{val.replace('_', ' ')}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="installation_age_years"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="uppercase text-lg flex justify-between">
                          <span>INSTALLATION AGE</span>
                          <span>{field.value} YEARS</span>
                        </FormLabel>
                        <FormControl>
                          <Slider
                            min={0}
                            max={50}
                            step={1}
                            value={[field.value]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                            className="py-4"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pipe_diameter_mm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="uppercase text-lg">PIPE DIAMETER (MM) - OPTIONAL</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            value={field.value || ''} 
                            onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)}
                            className="border-border rounded-none h-12"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8 animate-in fade-in">
                  <FormField
                    control={form.control}
                    name="avg_temp_celsius"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="uppercase text-lg flex justify-between">
                          <span>AVERAGE TEMP</span>
                          <span>{field.value} °C</span>
                        </FormLabel>
                        <FormControl>
                          <Slider
                            min={15}
                            max={50}
                            step={1}
                            value={[field.value]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                            className="py-4"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="daily_uv_hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="uppercase text-lg flex justify-between">
                          <span>DAILY UV HOURS</span>
                          <span>{field.value} HOURS</span>
                        </FormLabel>
                        <FormControl>
                          <Slider
                            min={0}
                            max={14}
                            step={1}
                            value={[field.value]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                            className="py-4"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="water_flow_rate"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="uppercase text-lg">WATER FLOW RATE</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            {Object.values(AssessmentInputWaterFlowRate).map((val) => (
                              <FormItem key={val} className="flex items-center space-x-3 space-y-0 border p-4 hover:bg-foreground/5 cursor-pointer">
                                <FormControl>
                                  <RadioGroupItem value={val} className="rounded-none border-border" />
                                </FormControl>
                                <FormLabel className="font-normal uppercase cursor-pointer flex-1">
                                  {val}
                                </FormLabel>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="buried_or_exposed"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="uppercase text-lg">BURIED OR EXPOSED</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            {Object.values(AssessmentInputBuriedOrExposed).map((val) => (
                              <FormItem key={val} className="flex items-center space-x-3 space-y-0 border p-4 hover:bg-foreground/5 cursor-pointer">
                                <FormControl>
                                  <RadioGroupItem value={val} className="rounded-none border-border" />
                                </FormControl>
                                <FormLabel className="font-normal uppercase cursor-pointer flex-1">
                                  {val}
                                </FormLabel>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8 animate-in fade-in">
                  <FormField
                    control={form.control}
                    name="use_context"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="uppercase text-2xl font-bold">USE CONTEXT (CRITICAL)</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-2"
                          >
                            {Object.values(AssessmentInputUseContext).map((val) => (
                              <FormItem key={val} className="flex items-center space-x-3 space-y-0 border-2 p-6 hover:border-accent cursor-pointer transition-colors [&:has([data-state=checked])]:border-accent [&:has([data-state=checked])]:bg-accent/10">
                                <FormControl>
                                  <RadioGroupItem value={val} className="rounded-none border-border text-accent" />
                                </FormControl>
                                <FormLabel className="font-bold uppercase text-lg cursor-pointer flex-1">
                                  {val.replace('_', ' ')}
                                </FormLabel>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="population_served"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="uppercase text-lg">POPULATION SERVED - OPTIONAL</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            value={field.value || ''} 
                            onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)}
                            className="border-border rounded-none h-12"
                            placeholder="e.g. 500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <div className="flex gap-4 pt-8 border-t mt-12">
                {step > 1 && (
                  <button 
                    type="button" 
                    onClick={() => setStep(step - 1)}
                    className="flex-1 py-4 border border-border uppercase hover:bg-foreground hover:text-background transition-colors"
                  >
                    BACK
                  </button>
                )}
                {step < 3 ? (
                  <button 
                    type="button" 
                    onClick={nextStep}
                    className="flex-1 py-4 border border-border bg-foreground text-background uppercase hover:bg-accent transition-colors"
                  >
                    NEXT
                  </button>
                ) : (
                  <button 
                    type="submit" 
                    disabled={createAssessment.isPending}
                    className="flex-1 py-4 border border-accent bg-accent text-background font-bold uppercase hover:bg-foreground transition-colors disabled:opacity-50"
                  >
                    {createAssessment.isPending ? "CALCULATING..." : "CALCULATE RISK"}
                  </button>
                )}
              </div>

            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}