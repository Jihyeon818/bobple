package kr.bit.bobple.service;

import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.CannedAccessControlList;
import com.amazonaws.services.s3.model.PutObjectRequest;
import kr.bit.bobple.dto.ChatMemberDTO;
import kr.bit.bobple.entity.ChatMember;
import kr.bit.bobple.entity.ChatRoom;
import kr.bit.bobple.entity.User;
import kr.bit.bobple.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class ChatRoomService {

    @Autowired
    private ChatRoomRepository chatRoomRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ChatMemberRepository chatMemberRepository;

    @Autowired
    private MessageReadRepository messageReadRepository;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private AmazonS3 amazonS3;

    @Value("${ncloud.object-storage.bucket-name}")
    private String bucketName;

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public ChatRoom createChatRoom(String title, String description, String location, int people, Long userIdx, MultipartFile imageFile) throws IOException {
        User user = userRepository.findById(userIdx).orElseThrow(() -> new RuntimeException("User not found"));

        ChatRoom chatRoom = new ChatRoom();
        chatRoom.setChatRoomTitle(title);
        chatRoom.setDescription(description);
        chatRoom.setLocation(location);
        chatRoom.setRoomPeople(people);
        chatRoom.setCurrentParticipants(1); // 방장 포함 초기 참가자 1명
        chatRoom.setCreatedAt(LocalDateTime.now());
        chatRoom.setRoomLeader(user);
        chatRoom.setStatus(ChatRoom.Status.RECRUITING); // 상태 초기화

        if (imageFile != null && !imageFile.isEmpty()) {
            String imageName = "chatroom/" + UUID.randomUUID().toString() + "_" + imageFile.getOriginalFilename();
            String imageUrl = uploadFileToS3(imageName, imageFile);
            chatRoom.setRoomImage(imageUrl);
        } else {
            chatRoom.setRoomImage("bobple_mascot.png"); // 기본 이미지 URL로 설정
        }

        chatRoom = chatRoomRepository.save(chatRoom);

        ChatMember chatMember = new ChatMember();
        ChatMember.ChatMemberId chatMemberId = new ChatMember.ChatMemberId(chatRoom.getChatRoomIdx(), user.getUserIdx());
        chatMember.setId(chatMemberId);
        chatMember.setChatRoom(chatRoom);
        chatMember.setUser(user);
        chatMember.setRole(ChatMember.Role.LEADER);
        chatMember.setJoinedAt(LocalDateTime.now().format(FORMATTER));  // LocalDateTime을 포맷하여 문자열로 저장 // 방장이 방을 만들 때 참여 시간 저장
        chatMemberRepository.save(chatMember);

        return chatRoom;
    }

    private String uploadFileToS3(String fileName, MultipartFile file) throws IOException {
        File convertedFile = convertMultiPartToFile(file);
        amazonS3.putObject(new PutObjectRequest(bucketName, fileName, convertedFile)
                .withCannedAcl(CannedAccessControlList.PublicRead));
        convertedFile.delete();
        return amazonS3.getUrl(bucketName, fileName).toString();
    }

    private File convertMultiPartToFile(MultipartFile file) throws IOException {
        File convFile = new File(System.getProperty("java.io.tmpdir") + "/" + file.getOriginalFilename());
        FileOutputStream fos = new FileOutputStream(convFile);
        fos.write(file.getBytes());
        fos.close();
        return convFile;
    }

    public ChatRoom joinChatRoom(Long chatRoomId, Long userId) {
        ChatRoom chatRoom = chatRoomRepository.findById(chatRoomId)
                .orElseThrow(() -> new RuntimeException("Chat room not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        ChatMember existingMember = chatMemberRepository.findById(new ChatMember.ChatMemberId(chatRoomId, userId))
                .orElse(null);

        if (existingMember != null && existingMember.getStatus() == ChatMember.Status.DENIED) {
            throw new RuntimeException("You are blocked from this chat room");
        }

        if (existingMember == null) {
            ChatMember chatMember = new ChatMember();
            ChatMember.ChatMemberId chatMemberId = new ChatMember.ChatMemberId(chatRoomId, userId);
            chatMember.setId(chatMemberId);
            chatMember.setChatRoom(chatRoom);
            chatMember.setUser(user);
            chatMember.setRole(ChatMember.Role.MEMBER);
            chatMember.setJoinedAt(LocalDateTime.now().format(FORMATTER));  // LocalDateTime을 포맷하여 문자열로 저장 // 유저가 참여할 때 참여 시간 저장
            chatMemberRepository.save(chatMember);

            chatRoom.setCurrentParticipants(chatRoom.getCurrentParticipants() + 1);
            chatRoom.updateStatus();
            chatRoomRepository.save(chatRoom);
        }

        return chatRoom;
    }

    public List<ChatRoom> getAllChatRoomsIncludingOrphaned(Long userIdx) {
        return chatRoomRepository.findByRoomLeaderUserIdxOrRoomLeaderIsNull(userIdx);
    }

    public ChatRoom getChatRoomById(Long chatRoomId) {
        return chatRoomRepository.findById(chatRoomId).orElse(null);
    }

    public List<ChatRoom> getChatRoomsByUser(Long userId) {
        List<Long> chatRoomIds = chatMemberRepository.findChatRoomIdsByUserIdx(userId);
        return chatRoomRepository.findAllById(chatRoomIds);
    }

    public List<ChatRoom> getAllChatRooms() {
        return chatRoomRepository.findAll();
    }


    // ChatRoomService.java
    public List<ChatMemberDTO> getChatRoomParticipants(Long chatRoomId) {
        List<ChatMember> members = chatMemberRepository.findByChatRoomChatRoomIdx(chatRoomId);

        List<ChatMemberDTO> leaders = members.stream()
                .filter(member -> member.getRole() == ChatMember.Role.LEADER)
                .map(member -> new ChatMemberDTO(
                        member.getUser().getUserIdx(),
                        member.getUser().getName(),
                        member.getUser().getProfileImage(),
                        member.getRole().name(),
                        member.getStatus().name()
                ))
                .collect(Collectors.toList());

        List<ChatMemberDTO> membersSorted = members.stream()
                .filter(member -> member.getRole() == ChatMember.Role.MEMBER)
                .sorted(Comparator.comparing(m -> m.getUser().getName()))
                .map(member -> new ChatMemberDTO(
                        member.getUser().getUserIdx(),
                        member.getUser().getName(),
                        member.getUser().getProfileImage(),
                        member.getRole().name(),
                        member.getStatus().name()
                ))
                .collect(Collectors.toList());

        leaders.addAll(membersSorted);
        return leaders;
    }

    public List<ChatRoom> getAvailableChatRoomsForUser(Long userId) {
        List<Long> chatRoomIds = chatMemberRepository.findChatRoomIdsByUserIdx(userId);
        return chatRoomRepository.findAllById(chatRoomIds).stream()
                .filter(chatRoom -> {
                    ChatMember chatMember = chatMemberRepository.findById(new ChatMember.ChatMemberId(chatRoom.getChatRoomIdx(), userId))
                            .orElseThrow(() -> new RuntimeException("User not found in chat room"));
                    return chatMember.getStatus() != ChatMember.Status.DENIED;
                })
                .collect(Collectors.toList());
    }

    public void blockUser(Long chatRoomId, Long userId) {
        ChatMember chatMember = chatMemberRepository.findById(new ChatMember.ChatMemberId(chatRoomId, userId))
                .orElseThrow(() -> new RuntimeException("User not found in chat room"));

        chatMember.setStatus(ChatMember.Status.DENIED);
        chatMemberRepository.save(chatMember);

        // 강퇴된 사용자의 모든 message_reads 정보 삭제
        messageReadRepository.deleteByUserIdAndChatRoomId(userId, chatRoomId);

        updateChatRoomStatusAfterBlock(chatRoomId);
    }

    private void updateChatRoomStatusAfterBlock(Long chatRoomId) {
        ChatRoom chatRoom = chatRoomRepository.findById(chatRoomId)
                .orElseThrow(() -> new RuntimeException("Chat room not found"));

        long activeMembersCount = chatMemberRepository.countByChatRoomChatRoomIdxAndStatus(chatRoomId, ChatMember.Status.ACCEPTED);

        chatRoom.setCurrentParticipants((int) activeMembersCount);
        chatRoom.updateStatus();
        chatRoomRepository.save(chatRoom);
    }

    public String getUserRoleInChatRoom(Long chatRoomId, Long userIdx) {
        ChatMember member = chatMemberRepository.findById(new ChatMember.ChatMemberId(chatRoomId, userIdx))
                .orElseThrow(() -> new RuntimeException("User not found in chat room"));
        return member.getRole().name();
    }

    public void deleteChatRoom(Long chatRoomId) {
        // 메시지 읽음 정보 삭제
        messageReadRepository.deleteByChatRoomId(chatRoomId);
        // 메시지 삭제
        messageRepository.deleteByChatRoomId(chatRoomId);
        // 채팅 멤버 삭제
        chatMemberRepository.deleteByChatRoomId(chatRoomId);
        // 채팅방 삭제
        chatRoomRepository.deleteById(chatRoomId);
    }

    public boolean isUserRoomLeader(Long chatRoomId, Long userId) {
        ChatRoom chatRoom = chatRoomRepository.findById(chatRoomId).orElseThrow(() -> new RuntimeException("Chat room not found"));
        return chatRoom.getRoomLeader().getUserIdx().equals(userId);
    }

    public void leaveChatRoom(Long chatRoomId, Long userIdx) {
        // ChatMember 엔티티에서 해당 유저를 제거
        ChatMember.ChatMemberId chatMemberId = new ChatMember.ChatMemberId(chatRoomId, userIdx);
        chatMemberRepository.deleteById(chatMemberId);

        // ChatRoom에서 currentParticipants 감소
        ChatRoom chatRoom = chatRoomRepository.findById(chatRoomId)
                .orElseThrow(() -> new RuntimeException("Chat room not found"));
        chatRoom.setCurrentParticipants(chatRoom.getCurrentParticipants() - 1);
        chatRoom.updateStatus();
        chatRoomRepository.save(chatRoom);

        // 메시지 읽음 정보 삭제
        messageReadRepository.deleteByUserIdAndChatRoomId(userIdx, chatRoomId);
    }

    public Optional<String> getUserJoinedAt(Long chatRoomId, Long userIdx) {
        return chatMemberRepository.findJoinedAtByChatRoomIdAndUserId(chatRoomId, userIdx);
    }
}
