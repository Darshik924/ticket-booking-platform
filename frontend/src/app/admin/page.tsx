"use client";

import { useMemo, useState, useEffect } from "react";
import Nav from "@/components/Nav";
import AdminEventCard from "@/components/AdminEventCard";
import AdminEventForm from "@/components/AdminEventForm";
import AdminProtect from "@/middleware/AdminProtect";
import { eventType } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

const Admin = () => {
  /* I have Made our admin page as in Three sections, see all the events, see the events and data, a simple search field for the events that searches the things only on the frontend only, there is a common Events editor to avoid complexity for all the actions and you can only change the specific feilds in our editor (The AdminEventForm components does all the job) serving as a universal form*/

  // Now there are functions one for the fetchEvents which is the same copy as the one in our /events just fetches all the events and then updates our state on the UI

  const [events, setEvents] = useState<eventType[]>([]);
  const { loading: authLoading } = useAuth();

  const [selectedEvent, setSelectedEvent] = useState<eventType | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formEvent, setFormEvent] = useState<Partial<eventType>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<number | null>(null);

  // this function is the common error state generator in out page pretty straightforward
  const getErrorMessage = (error: unknown) => {
    if (typeof error === "object" && error !== null) {
      if ("response" in error && (error as any).response?.data?.error) {
        return String((error as any).response.data.error);
      }
      if ("message" in error) return String((error as any).message);
    }

    return "An unexpected error occurred.";
  };

  const fetchEvents = async () => {
    setPageError("");
    try {
      setLoading(true);
      const res = await api.get("/api/events");
      setEvents(res.data.events || []);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    fetchEvents();
  }, [authLoading]);

  const filteredEvents = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return events.filter(
      (event) =>
        event.name.toLowerCase().includes(query) ||
        event.venue.toLowerCase().includes(query),
    );
  }, [events, searchQuery]);

  //   Function that will be fired on clicking Edit for any event and its details will be changes to of this event now admin and see and modify the events using the AdminEventForm
  const handleEdit = (event: eventType) => {
    setSelectedEvent(event);
    setFormEvent(event);
    setIsFormOpen(true);
    setFormError("");
    setSuccessMessage("");
  };

  //   Function directly calling out DELETE Api to delete a function with a simple confirmation
  const handleDelete = async (eventId: number) => {
    const confirmed = window.confirm(
      "Delete this event? This cannot be undone.",
    );
    if (!confirmed) return;

    setDeleteLoadingId(eventId);
    setPageError("");
    setSuccessMessage("");

    try {
      await api.delete(`/api/events/${eventId}`);
      await fetchEvents();
      if (selectedEvent?.id === eventId) {
        setSelectedEvent(null);
        setFormEvent({});
        setIsFormOpen(false);
      }
      setSuccessMessage("Event deleted successfully.");
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setDeleteLoadingId(null);
    }
  };

  //   Function that handles creation of an event setting our all data in our selected event set and form event to null and then we can add a few things and save changes using our AdminFormEvent
  const handleCreate = () => {
    setSelectedEvent(null);
    setFormEvent({
      name: "",
      venue: "",
      date: new Date().toISOString().slice(0, 16),
      totalSeats: 50,
      availableSeats: 50,
    });
    setIsFormOpen(true);
    setFormError("");
    setSuccessMessage("");
  };

  //   Universal Function again to update the changes that will be seen on our AdminFormEvent
  const handleChange = (field: string, value: string | number) => {
    setFormEvent((current) => ({ ...current, [field]: value }));
  };

  //   This is the main save changes function now this makes a required payload to be passed as json to our api and logically if an event is selected we update it using our put and if it is selected then user might just be asking to create an event
  const handleSave = async () => {
    if (
      !formEvent.name ||
      !formEvent.venue ||
      !formEvent.date ||
      !formEvent.totalSeats
    ) {
      setFormError("Please fill out all event fields before saving.");
      return;
    }

    if (
      selectedEvent &&
      Number(formEvent.totalSeats) < selectedEvent.availableSeats
    ) {
      setFormError(
        `Total seats cannot be lower than current available seats (${selectedEvent.availableSeats}).`,
      );
      return;
    }

    setActionLoading(true);
    setPageError("");
    setFormError("");
    setSuccessMessage("");

    const payload = {
      name: String(formEvent.name),
      venue: String(formEvent.venue),
      date: new Date(String(formEvent.date)).toISOString(),
      totalSeats: Number(formEvent.totalSeats),
    };

    try {
      if (selectedEvent) {
        await api.put(`/api/events/${selectedEvent.id}`, payload);
        setSuccessMessage("Event updated successfully.");
      } else {
        await api.post("/api/events", payload);
        setSuccessMessage("Event created successfully.");
      }

      await fetchEvents();
      setSelectedEvent(null);
      setFormEvent({});
      setIsFormOpen(false);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  //   Function to cancel or nullify our everything selected on to the form compoenent
  const handleCancel = () => {
    setSelectedEvent(null);
    setFormEvent({});
    setFormError("");
    setIsFormOpen(false);
  };

  return (
    <AdminProtect>
      <div className="min-h-screen bg-background">
        <Nav />
        <main className="mx-auto max-w-7xl px-6 py-10">
          <div className="mb-10 rounded-4xl border border-border bg-card p-8 shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                  Admin dashboard
                </p>
                <h1 className="mt-3 text-3xl font-semibold text-foreground sm:text-4xl">
                  Manage events & sessions
                </h1>
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                  Use this page to preview event details, edit metadata, and
                  prepare new shows before publishing.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCreate}
                disabled={actionLoading}
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                + New event
              </button>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-1">
              <div className="rounded-3xl border border-border bg-muted p-4">
                <p className="text-sm text-muted-foreground">Total events</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">
                  {events.length}
                </p>
              </div>
            </div>
          </div>

          {successMessage && (
            <div className="mb-6 rounded-3xl border border-secondary/20 bg-secondary/10 px-5 py-4 text-sm text-secondary-foreground">
              {successMessage}
            </div>
          )}

          {pageError && (
            <div className="mb-6 rounded-3xl border border-destructive/20 bg-destructive/10 px-5 py-4 text-sm text-destructive">
              {pageError}
            </div>
          )}

          <section className="grid gap-8 xl:grid-cols-[1fr_420px]">
            <div>
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <label className="relative block">
                    <span className="sr-only">Search events</span>
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search events or venue"
                      className="w-full rounded-3xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                    />
                  </label>
                </div>
              </div>

              {loading ? (
                <div className="rounded-3xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
                  Loading events...
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {filteredEvents.map((event) => (
                    <AdminEventCard
                      key={event.id}
                      event={event}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      isDeleting={deleteLoadingId === event.id}
                    />
                  ))}
                  {filteredEvents.length === 0 && (
                    <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
                      No matching events found. Try another search term or
                      create a new event.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="sticky top-6">
              <div className="rounded-4xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Event editor
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isFormOpen
                        ? "Change fields and save"
                        : "Select an event to edit or create a new one."}
                    </p>
                  </div>
                </div>

                {isFormOpen ? (
                  <>
                    {formError && (
                      <div className="mb-4 rounded-3xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {formError}
                      </div>
                    )}
                    <AdminEventForm
                      event={formEvent}
                      onChange={handleChange}
                      onSubmit={handleSave}
                      onCancel={handleCancel}
                      isSubmitting={actionLoading}
                    />
                  </>
                ) : (
                  <div className="rounded-3xl border border-dashed border-border bg-muted p-6 text-sm text-muted-foreground">
                    <p className="mb-3 font-medium text-foreground">
                      Quick actions
                    </p>
                    <ul className="space-y-3">
                      <li>• Click “Edit” on an existing event</li>
                      <li>• Press “New event” to open the editor</li>
                      <li>• Change date, venue, or seat count</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </AdminProtect>
  );
};

export default Admin;
