import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useTranslation } from '@/lib/i18n';
import { useApp } from '@/contexts/AppContext';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Send, Loader2, MessageCircle } from 'lucide-react';
import { type Message, type Job } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';
import { fr, ar, enUS } from 'date-fns/locale';

const dateLocales = {
  'fr-MA': fr,
  'ar-MA': ar,
  'en-US': enUS,
};

export default function Messages() {
  const { locale, currentUser } = useApp();
  const { t } = useTranslation(locale);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');

  const { data: conversations = [], isLoading: convsLoading } = useQuery<
    (Job & { lastMessage?: Message; unreadCount: number })[]
  >({
    queryKey: ['/api/messages/conversations'],
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<
    (Message & { senderName: string })[]
  >({
    queryKey: ['/api/jobs', selectedJobId, 'messages'],
    enabled: !!selectedJobId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data: { jobId: string; body: string }) =>
      apiRequest('POST', '/api/messages', {
        jobId: data.jobId,
        senderId: currentUser?.id || '80bc66ef-1602-4a00-9272-0aef66d83d3c', // TODO: Get from auth (ahmed@example.ma)
        body: data.body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', selectedJobId, 'messages'] });
    },
  });

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedJobId) return;
    
    sendMessageMutation.mutate({
      jobId: selectedJobId,
      body: messageInput,
    });
    setMessageInput('');
  };

  const selectedConversation = conversations.find(c => c.id === selectedJobId);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 h-[calc(100vh-4rem)]">
        <Card className="h-full flex flex-col md:flex-row overflow-hidden">
          {/* Conversations List */}
          <div className="md:w-80 border-r flex flex-col">
            <CardHeader className="border-b">
              <CardTitle>{t('nav.messages')}</CardTitle>
            </CardHeader>
            <div className="flex-1 overflow-y-auto">
              {convsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                  <MessageCircle className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucune conversation</p>
                </div>
              ) : (
                <div>
                  {conversations.map((conv) => {
                    const spec = conv.spec as any;
                    const title = spec?.description || t(`category.${conv.category}` as any);
                    return (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedJobId(conv.id)}
                        className={`w-full text-left p-4 border-b hover-elevate transition-colors ${
                          selectedJobId === conv.id ? 'bg-muted' : ''
                        }`}
                        data-testid={`button-conversation-${conv.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                              {conv.category[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm truncate">{title}</h4>
                            {conv.lastMessage && (
                              <p className="text-sm text-muted-foreground truncate">
                                {conv.lastMessage.body}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {conv.city}
                            </p>
                          </div>
                          {conv.unreadCount > 0 && (
                            <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-semibold">
                              {conv.unreadCount}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {selectedJobId ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b">
                  <h3 className="font-semibold">
                    {selectedConversation?.spec && (selectedConversation.spec as any).description}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedConversation?.city}
                  </p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isOwnMessage = message.senderId === currentUser?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-md rounded-lg px-4 py-2 ${
                              isOwnMessage
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            {!isOwnMessage && (
                              <p className="text-xs font-semibold mb-1">{message.senderName}</p>
                            )}
                            <p className="text-sm">{message.body}</p>
                            <p className={`text-xs mt-1 ${isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                              {formatDistanceToNow(new Date(message.createdAt), {
                                addSuffix: true,
                                locale: dateLocales[locale],
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      placeholder={t('message.send')}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      data-testid="input-message"
                    />
                    <Button onClick={handleSendMessage} data-testid="button-send-message">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Sélectionnez une conversation</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
